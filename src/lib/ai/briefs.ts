import { sql } from "drizzle-orm";
import { gateway, generateText, type LanguageModel } from "ai";
import { getEnv } from "@/env";
import { formatDataDate, weekStart } from "@/lib/dates";
import type { Db } from "@/lib/db";
import { aiBriefs } from "@/lib/db/schema";
import { computeChange, formatPercent, formatRupees } from "@/lib/format";
import { isUnderTokenCap, recordTokens } from "./guards";
import { findUnsupportedNumbers } from "./verify";

/**
 * Weekly briefs (SPEC §8.8). The facts are computed here, in code; the model only rewrites
 * them as prose and never sees the database. Briefs are saved as drafts for human review.
 */

export interface BriefFacts {
  crop: string;
  weekStart: string;
  latest: { date: string; price: number; markets: number } | null;
  weekAgo: { date: string; price: number } | null;
  monthAgo: { date: string; price: number } | null;
  weekChangePercent: number | null;
  monthChangePercent: number | null;
  topMarkets: { market: string; state: string; price: number; date: string }[];
  biggestRises: { market: string; state: string; from: number; to: number; percent: number }[];
  msp: { price: number; season: string; year: string; gapPercent: number } | null;
  exports: { group: string; year: string; valueUsdMillion: number; topCountry: string | null } | null;
}

export async function buildBriefFacts(
  db: Db,
  commodityId: number,
  cropName: string,
  asOf: string,
): Promise<BriefFacts> {
  const week = weekStart(asOf);
  const national = await db.execute<{ date: string; price: number; markets: number }>(sql`
    select arrival_date::text as date, median_modal as price, markets_reporting as markets
    from prices_national_daily where commodity_id = ${commodityId} and arrival_date <= ${asOf}::date
    order by arrival_date desc limit 40`);
  const points = national.rows;
  const latest = points[0] ?? null;
  const near = (days: number) =>
    points.find((p) => {
      const diff = (Date.parse(`${latest!.date}T00:00:00Z`) - Date.parse(`${p.date}T00:00:00Z`)) / 86_400_000;
      return diff >= days - 3 && diff <= days + 3;
    }) ?? null;
  const weekAgo = latest ? near(7) : null;
  const monthAgo = latest ? near(30) : null;

  const top = await db.execute<{ market: string; state: string; price: number; date: string }>(sql`
    with latest as (
      select distinct on (pm.market_id) pm.market_id, pm.arrival_date, pm.modal_price
      from prices_market_daily pm
      where pm.commodity_id = ${commodityId} and pm.arrival_date between ${asOf}::date - 10 and ${asOf}::date
      order by pm.market_id, pm.arrival_date desc
    )
    select m.name as market, s.name as state, l.modal_price as price, l.arrival_date::text as date
    from latest l join markets m on m.id = l.market_id join districts d on d.id = m.district_id join states s on s.id = d.state_id
    order by l.modal_price desc limit 3`);

  const movers = await db.execute<{
    market: string;
    state: string;
    from: number;
    to: number;
    percent: number;
  }>(sql`
    with now_prices as (
      select distinct on (pm.market_id) pm.market_id, pm.modal_price
      from prices_market_daily pm
      where pm.commodity_id = ${commodityId} and pm.arrival_date between ${asOf}::date - 3 and ${asOf}::date
      order by pm.market_id, pm.arrival_date desc
    ),
    then_prices as (
      select distinct on (pm.market_id) pm.market_id, pm.modal_price
      from prices_market_daily pm
      where pm.commodity_id = ${commodityId} and pm.arrival_date between ${asOf}::date - 11 and ${asOf}::date - 7
      order by pm.market_id, pm.arrival_date desc
    )
    select m.name as market, s.name as state, t.modal_price as from, n.modal_price as to,
           round(((n.modal_price - t.modal_price)::numeric / t.modal_price) * 100, 1)::float as percent
    from now_prices n join then_prices t on t.market_id = n.market_id
    join markets m on m.id = n.market_id join districts d on d.id = m.district_id join states s on s.id = d.state_id
    where t.modal_price > 0
    order by percent desc limit 3`);

  const mspRow = await db.execute<{ price: number; season: string; year: string }>(sql`
    select msp_price as price, season, year from msp where commodity_id = ${commodityId} order by year desc limit 1`);
  const msp = mspRow.rows[0] ?? null;

  const exportRow = await db.execute<{
    group: string;
    year: string;
    value: string;
    country: string | null;
  }>(sql`
    with mapped as (
      select e.id, e.display_name as name from crop_mapping m join export_commodities e on e.id = m.export_commodity_id
      where m.commodity_id = ${commodityId} and m.status in ('verified', 'suggested')
      order by (m.status = 'verified') desc, m.confidence desc nulls last limit 1
    )
    select mapped.name as "group", a.year, a.value_usd_million::text as value,
           (select c.display_name from exports_annual t join countries c on c.id = t.country_id
            where t.export_commodity_id = mapped.id and t.year = a.year and t.country_id is not null
            order by t.value_usd_million desc limit 1) as country
    from exports_annual a, mapped
    where a.export_commodity_id = mapped.id and a.country_id is null
    order by a.year desc limit 1`);
  const exports = exportRow.rows[0] ?? null;

  const weekChange = latest && weekAgo ? computeChange(weekAgo.price, latest.price) : null;
  const monthChange = latest && monthAgo ? computeChange(monthAgo.price, latest.price) : null;
  const mspChange = latest && msp ? computeChange(msp.price, latest.price) : null;

  return {
    crop: cropName,
    weekStart: week,
    latest,
    weekAgo: weekAgo ? { date: weekAgo.date, price: weekAgo.price } : null,
    monthAgo: monthAgo ? { date: monthAgo.date, price: monthAgo.price } : null,
    weekChangePercent: weekChange ? Math.round(weekChange.percent * 10) / 10 : null,
    monthChangePercent: monthChange ? Math.round(monthChange.percent * 10) / 10 : null,
    topMarkets: top.rows,
    biggestRises: movers.rows,
    msp: msp && mspChange ? { ...msp, gapPercent: Math.round(mspChange.percent * 10) / 10 } : null,
    exports: exports
      ? {
          group: exports.group,
          year: exports.year,
          valueUsdMillion: Number(exports.value),
          topCountry: exports.country,
        }
      : null,
  };
}

export const BRIEF_SYSTEM_PROMPT = `You write short weekly market briefs for Mandiport, an Indian mandi price website.

You are given a JSON object of facts computed from official data. Rules:
1. Use ONLY the numbers in the facts. Never add, estimate or predict figures.
2. Always attach the date to each price, exactly as given.
3. 150 to 300 words, plain English, no headings inside the body.
4. Start with a one-line headline on its own first line, at most 70 characters, then a blank line, then the body.
5. Mention the number of markets reporting when given, and say prices are in rupees per quintal.
6. Never advise buying, selling or storing, and never forecast. Describe what the data shows.
7. If a fact is null, leave it out rather than guessing.`;

export function factsSummary(facts: BriefFacts): string {
  const lines = [`Crop: ${facts.crop}`, `Week starting: ${formatDataDate(facts.weekStart)}`];
  if (facts.latest)
    lines.push(
      `Latest national median: ${formatRupees(facts.latest.price)} per quintal on ${formatDataDate(facts.latest.date)} from ${facts.latest.markets} markets`,
    );
  if (facts.weekChangePercent !== null)
    lines.push(
      `Change vs a week earlier: ${formatPercent(facts.weekChangePercent)} ${facts.weekChangePercent >= 0 ? "up" : "down"}`,
    );
  if (facts.monthChangePercent !== null)
    lines.push(
      `Change vs a month earlier: ${formatPercent(facts.monthChangePercent)} ${facts.monthChangePercent >= 0 ? "up" : "down"}`,
    );
  return lines.join("\n");
}

export interface GeneratedBrief {
  headline: string;
  bodyMd: string;
  facts: BriefFacts;
  modelId: string;
  tokens: number;
}

/** Generates one draft brief. Returns null when there is not enough data or the cap is reached. */
export async function generateBrief(
  facts: BriefFacts,
  options: { model?: LanguageModel; now?: Date } = {},
): Promise<GeneratedBrief | null> {
  const env = getEnv();
  if (!facts.latest || facts.topMarkets.length === 0) return null;
  if (!options.model && (!env.AI_GATEWAY_API_KEY || !env.AI_MODEL_ID)) return null;
  if (!(await isUnderTokenCap(options.now))) return null;

  const result = await generateText({
    model: options.model ?? gateway(env.AI_MODEL_ID!),
    system: BRIEF_SYSTEM_PROMPT,
    prompt: JSON.stringify(facts, null, 2),
    temperature: 0.3,
    maxOutputTokens: 700,
  });
  const tokens = result.usage?.totalTokens ?? 0;
  await recordTokens(tokens, options.now);

  const text = result.text.trim();
  const [headlineLine, ...rest] = text.split("\n");
  const headline = (headlineLine ?? "")
    .replace(/^#+\s*/, "")
    .trim()
    .slice(0, 110);
  const bodyMd = rest.join("\n").trim();
  if (!headline || bodyMd.length < 100) return null;
  if (findUnsupportedNumbers(text, [facts]).length > 0) return null;

  return { headline, bodyMd, facts, modelId: env.AI_MODEL_ID ?? "test-model", tokens };
}

export async function saveDraftBrief(
  db: Db,
  commodityId: number,
  brief: GeneratedBrief,
  language = "en",
): Promise<void> {
  await db
    .insert(aiBriefs)
    .values({
      commodityId,
      weekStart: brief.facts.weekStart,
      language,
      headline: brief.headline,
      bodyMd: brief.bodyMd,
      factsJson: brief.facts,
      modelId: brief.modelId,
      status: "draft",
    })
    .onConflictDoUpdate({
      target: [aiBriefs.commodityId, aiBriefs.weekStart, aiBriefs.language],
      set: {
        headline: sql`excluded.headline`,
        bodyMd: sql`excluded.body_md`,
        factsJson: sql`excluded.facts_json`,
        modelId: sql`excluded.model_id`,
        updatedAt: sql`now()`,
      },
      // Never overwrite a brief a human has already published.
      setWhere: sql`${aiBriefs.status} = 'draft'`,
    });
}
