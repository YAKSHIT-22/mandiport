import { formatDataDate } from "@/lib/dates";
import { computeChange, formatNumber, formatPercent, formatRupees, formatUsdMillion } from "@/lib/format";

/**
 * Data-driven explanatory copy (SPEC §9.4). Each paragraph type has 6 written variants, chosen
 * deterministically from the page slug so text is stable between builds. A paragraph is only
 * produced when every fact it states exists; nothing is claimed beyond the data.
 */

export interface CopyFacts {
  slug: string;
  crop: string;
  place: string; // "India", "Maharashtra", "Lasalgaon APMC"
  latest?: { price: number; date: string; markets?: number };
  weekAgo?: { price: number; date: string } | null;
  monthAgo?: { price: number; date: string } | null;
  highest?: { market: string; price: number; date: string } | null;
  lowest?: { market: string; price: number; date: string } | null;
  msp?: { price: number; season: string; year: string } | null;
  exports?: {
    group: string;
    latestYear: string;
    latestValue: number;
    previousYear?: string;
    previousValue?: number;
    topCountry?: string;
    topCountryValue?: number;
    verified: boolean;
  } | null;
}

/** FNV-1a: small, stable string hash. */
export function stableHash(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function pickVariant<T>(slug: string, type: string, variants: T[]): T {
  return variants[stableHash(`${slug}:${type}`) % variants.length]!;
}

const d = formatDataDate;
const r = formatRupees;

function headlineParagraph(f: CopyFacts): string | null {
  if (!f.latest) return null;
  const { price, date, markets } = f.latest;
  const m = markets && markets > 1 ? `${formatNumber(markets)} markets` : null;
  const variants = [
    `The latest ${f.crop.toLowerCase()} price in ${f.place} is ${r(price)} per quintal, from data dated ${d(date)}${m ? ` across ${m}` : ""}.`,
    `On ${d(date)}, ${f.crop.toLowerCase()} traded at a ${m ? "median " : ""}modal price of ${r(price)} per quintal in ${f.place}${m ? `, based on reports from ${m}` : ""}.`,
    `${f.crop} in ${f.place} was quoted at ${r(price)} per quintal on ${d(date)}${m ? `, the middle value of ${m} that reported that day` : ""}.`,
    `Our most recent official figure for ${f.crop.toLowerCase()} in ${f.place} is ${r(price)} a quintal, dated ${d(date)}${m ? `, with ${m} reporting` : ""}.`,
    `${m ? `${m[0]!.toUpperCase()}${m.slice(1)} reported ${f.crop.toLowerCase()} on ${d(date)}; their median modal price was ${r(price)} per quintal in ${f.place}.` : `${f.crop} fetched a modal price of ${r(price)} per quintal in ${f.place} on ${d(date)}.`}`,
    `As of the ${d(date)} data, a quintal of ${f.crop.toLowerCase()} in ${f.place} was priced at ${r(price)}${m ? ` (median of ${m})` : ""}.`,
  ];
  return pickVariant(f.slug, "headline", variants);
}

function changeParagraph(f: CopyFacts): string | null {
  if (!f.latest) return null;
  const week = f.weekAgo ? computeChange(f.weekAgo.price, f.latest.price) : null;
  const month = f.monthAgo ? computeChange(f.monthAgo.price, f.latest.price) : null;
  if (!week && !month) return null;
  const describe = (c: NonNullable<typeof week>, ref: { date: string }) =>
    c.direction === "flat"
      ? `unchanged from ${d(ref.date)}`
      : `${c.direction === "up" ? "up" : "down"} ${r(Math.abs(c.absolute))} (${formatPercent(c.percent)}) from ${r(c.from)} on ${d(ref.date)}`;
  const w = week && f.weekAgo ? describe(week, f.weekAgo) : null;
  const mo = month && f.monthAgo ? describe(month, f.monthAgo) : null;
  const both = w && mo;
  const variants = [
    both
      ? `Compared with about a week earlier the price is ${w}; against a month earlier it is ${mo}.`
      : `Compared with ${w ? "about a week" : "about a month"} earlier, the price is ${w ?? mo}.`,
    both
      ? `Over the past week it moved ${w}, and over the past month ${mo}.`
      : `Over the past ${w ? "week" : "month"} it moved ${w ?? mo}.`,
    both
      ? `Week on week the figure is ${w}. Month on month it is ${mo}.`
      : `${w ? "Week on week" : "Month on month"} the figure is ${w ?? mo}.`,
    both
      ? `Looking back seven days, the price is ${w}. Looking back thirty days, it is ${mo}.`
      : `Looking back ${w ? "seven" : "thirty"} days, the price is ${w ?? mo}.`,
    both
      ? `The short-term change is ${w}; the one-month change is ${mo}.`
      : `The ${w ? "short-term" : "one-month"} change is ${w ?? mo}.`,
    both
      ? `That is ${w} over a week and ${mo} over a month.`
      : `That is ${w ?? mo} over ${w ? "a week" : "a month"}.`,
  ];
  return pickVariant(f.slug, "change", variants) + " Past movements do not predict future prices.";
}

function spreadParagraph(f: CopyFacts): string | null {
  const { highest: hi, lowest: lo } = f;
  if (!hi || !lo || hi.market === lo.market || hi.price === lo.price) return null;
  const gap = r(hi.price - lo.price);
  const variants = [
    `Prices vary widely between markets: ${hi.market} reported ${r(hi.price)} (${d(hi.date)}) while ${lo.market} reported ${r(lo.price)} (${d(lo.date)}), a gap of ${gap}. Quality, variety and arrivals explain much of this.`,
    `The highest recent quote came from ${hi.market} at ${r(hi.price)} on ${d(hi.date)}; the lowest from ${lo.market} at ${r(lo.price)} on ${d(lo.date)}. Grades and varieties differ between markets, so compare like with like.`,
    `Across markets, recent modal prices ran from ${r(lo.price)} at ${lo.market} (${d(lo.date)}) to ${r(hi.price)} at ${hi.market} (${d(hi.date)}).`,
    `${hi.market} topped recent reports at ${r(hi.price)} per quintal (${d(hi.date)}), ${gap} above ${lo.market}'s ${r(lo.price)} (${d(lo.date)}).`,
    `A seller comparing markets would have seen ${r(hi.price)} at ${hi.market} on ${d(hi.date)} and ${r(lo.price)} at ${lo.market} on ${d(lo.date)}. Transport cost and quality matter as much as the headline price.`,
    `The spread between the highest and lowest reporting markets was ${gap}: ${hi.market} at ${r(hi.price)} (${d(hi.date)}) and ${lo.market} at ${r(lo.price)} (${d(lo.date)}).`,
  ];
  return pickVariant(f.slug, "spread", variants);
}

function mspParagraph(f: CopyFacts): string | null {
  if (!f.msp || !f.latest) return null;
  const c = computeChange(f.msp.price, f.latest.price);
  if (!c) return null;
  const season =
    `${f.msp.season === "rabi" ? "rabi" : f.msp.season === "kharif" ? "kharif" : ""} marketing season ${f.msp.year}`.trim();
  const position =
    c.direction === "flat"
      ? "level with"
      : `${formatPercent(c.percent)} ${c.direction === "up" ? "above" : "below"}`;
  const variants = [
    `The minimum support price (MSP) for the ${season} is ${r(f.msp.price)} per quintal. The latest market price is ${position} it.`,
    `Against the government MSP of ${r(f.msp.price)} (${season}), the ${d(f.latest.date)} price sits ${position} the support level.`,
    `MSP for the ${season} was fixed at ${r(f.msp.price)} per quintal; market prices on ${d(f.latest.date)} were ${position} that figure.`,
    `With MSP at ${r(f.msp.price)} for the ${season}, the current modal price is ${position} MSP. MSP applies to government procurement, not to every mandi sale.`,
    `The ${season} MSP stands at ${r(f.msp.price)}. On ${d(f.latest.date)} the market was ${position} it.`,
    `For reference, MSP (${season}) is ${r(f.msp.price)} a quintal, and the latest reported price is ${position} this level.`,
  ];
  return pickVariant(f.slug, "msp", variants);
}

function exportsParagraph(f: CopyFacts): string | null {
  const e = f.exports;
  if (!e) return null;
  const trend =
    e.previousValue !== undefined && e.previousYear
      ? (() => {
          const c = computeChange(e.previousValue, e.latestValue);
          if (!c) return null;
          return c.direction === "flat"
            ? `about the same as in ${e.previousYear}`
            : `${c.direction === "up" ? "up" : "down"} ${formatPercent(c.percent)} from ${formatUsdMillion(e.previousValue)} in ${e.previousYear}`;
        })()
      : null;
  const top =
    e.topCountry && e.topCountryValue !== undefined
      ? `${e.topCountry} (${formatUsdMillion(e.topCountryValue)})`
      : null;
  const group = e.group.toLowerCase();
  const variants = [
    `India's exports of ${group} were worth ${formatUsdMillion(e.latestValue)} in ${e.latestYear}${trend ? `, ${trend}` : ""}.${top ? ` The largest buyer was ${top}.` : ""}`,
    `In ${e.latestYear}, exports under “${e.group}” reached ${formatUsdMillion(e.latestValue)}${trend ? ` (${trend})` : ""}${top ? `, led by ${top}` : ""}.`,
    `Official trade data put ${e.latestYear} exports of ${group} at ${formatUsdMillion(e.latestValue)}.${trend ? ` That is ${trend}.` : ""}${top ? ` ${top.split(" (")[0]} bought the most.` : ""}`,
    `${e.group} exports totalled ${formatUsdMillion(e.latestValue)} in ${e.latestYear}${top ? `; ${top} was the top destination` : ""}${trend ? `, ${trend}` : ""}.`,
    `${top ? `${top.split(" (")[0]} was the top destination` : "Exports went to many countries"} for India's ${group} in ${e.latestYear}, when shipments were worth ${formatUsdMillion(e.latestValue)}${trend ? ` (${trend})` : ""}.`,
    `The latest annual export figure for ${group} is ${formatUsdMillion(e.latestValue)} (${e.latestYear})${trend ? `, ${trend}` : ""}${top ? `, with ${top} the biggest market` : ""}.`,
  ];
  const note = e.verified
    ? ""
    : " This export group is matched to the crop automatically and has not yet been reviewed.";
  return pickVariant(f.slug, "exports", variants) + ` Export data is annual and published with a lag.${note}`;
}

/** 2–4 paragraphs for an indexable page, in a fixed order. */
export function buildPageCopy(facts: CopyFacts): string[] {
  return [
    headlineParagraph(facts),
    changeParagraph(facts),
    spreadParagraph(facts),
    mspParagraph(facts),
    exportsParagraph(facts),
  ]
    .filter((p): p is string => p !== null)
    .slice(0, 4);
}
