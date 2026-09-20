import { formatDataDate } from "@/lib/dates";
import { computeChange, formatNumber, formatPercent, formatRupees, formatUsdMillion } from "@/lib/format";
import { pickVariant, type CopyFacts } from "./copy";

/**
 * Hindi versions of the data-driven paragraphs in `copy.ts`. Same rule: a paragraph appears only
 * when every fact it states exists, and nothing is claimed beyond the data.
 *
 * English has six variants per paragraph because each English page is its own indexed URL and
 * identical wording across thousands of pages reads as boilerplate to search engines. Hindi
 * shares those URLs (the language is a cookie, not a path), so three variants are enough to keep
 * the writing from feeling mechanical.
 */

const d = (date: string) => formatDataDate(date, "hi");
const r = formatRupees;

function headline(f: CopyFacts): string | null {
  if (!f.latest) return null;
  const { price, date, markets } = f.latest;
  const m = markets && markets > 1 ? `${formatNumber(markets)} मंडियों` : null;
  const variants = [
    `${f.place} में ${f.crop} का ताज़ा भाव ${r(price)} प्रति क्विंटल है, ${d(date)} के आँकड़ों के अनुसार${m ? `, ${m} की रिपोर्ट पर आधारित` : ""}।`,
    `${d(date)} को ${f.place} में ${f.crop} का ${m ? "मध्य " : ""}मॉडल भाव ${r(price)} प्रति क्विंटल रहा${m ? `, जो ${m} की रिपोर्ट से निकला है` : ""}।`,
    `हमारे पास ${f.place} में ${f.crop} का सबसे ताज़ा सरकारी आँकड़ा ${r(price)} प्रति क्विंटल का है, तारीख ${d(date)}${m ? `, ${m} की रिपोर्ट के साथ` : ""}।`,
  ];
  return pickVariant(f.slug, "headline", variants);
}

function change(f: CopyFacts): string | null {
  if (!f.latest) return null;
  const week = f.weekAgo ? computeChange(f.weekAgo.price, f.latest.price) : null;
  const month = f.monthAgo ? computeChange(f.monthAgo.price, f.latest.price) : null;
  if (!week && !month) return null;
  const describe = (c: NonNullable<typeof week>, ref: { date: string }) =>
    c.direction === "flat"
      ? `${d(ref.date)} के मुकाबले बिना बदलाव`
      : `${d(ref.date)} के ${r(c.from)} से ${r(Math.abs(c.absolute))} (${formatPercent(c.percent)}) ${c.direction === "up" ? "ऊपर" : "नीचे"}`;
  const w = week && f.weekAgo ? describe(week, f.weekAgo) : null;
  const mo = month && f.monthAgo ? describe(month, f.monthAgo) : null;
  const both = w && mo;
  const variants = [
    both
      ? `करीब एक हफ्ते पहले से भाव ${w} है; एक महीने पहले से ${mo}।`
      : `करीब ${w ? "एक हफ्ते" : "एक महीने"} पहले से भाव ${w ?? mo} है।`,
    both
      ? `पिछले हफ्ते में यह ${w} रहा, और पिछले महीने में ${mo}।`
      : `पिछले ${w ? "हफ्ते" : "महीने"} में यह ${w ?? mo} रहा।`,
    both
      ? `सात दिन पीछे देखें तो भाव ${w} है। तीस दिन पीछे देखें तो ${mo}।`
      : `${w ? "सात" : "तीस"} दिन पीछे देखें तो भाव ${w ?? mo} है।`,
  ];
  return pickVariant(f.slug, "change", variants) + " बीते बदलाव आगे के भाव नहीं बताते।";
}

function spread(f: CopyFacts): string | null {
  const { highest: hi, lowest: lo } = f;
  if (!hi || !lo || hi.market === lo.market || hi.price === lo.price) return null;
  const gap = r(hi.price - lo.price);
  const variants = [
    `मंडियों के बीच भाव में काफ़ी फ़र्क है: ${hi.market} ने ${r(hi.price)} (${d(hi.date)}) दर्ज किया जबकि ${lo.market} ने ${r(lo.price)} (${d(lo.date)}), यानी ${gap} का फ़ासला। इसका बड़ा हिस्सा गुणवत्ता, किस्म और आवक से समझ आता है।`,
    `हाल की सबसे ऊँची बोली ${hi.market} से आई, ${r(hi.price)}, ${d(hi.date)} को; सबसे कम ${lo.market} से, ${r(lo.price)}, ${d(lo.date)} को। मंडियों में श्रेणियाँ और किस्में अलग होती हैं, इसलिए बराबरी की तुलना करें।`,
    `मंडियों में हाल के मॉडल भाव ${lo.market} के ${r(lo.price)} (${d(lo.date)}) से लेकर ${hi.market} के ${r(hi.price)} (${d(hi.date)}) तक रहे।`,
  ];
  return pickVariant(f.slug, "spread", variants);
}

function msp(f: CopyFacts): string | null {
  if (!f.msp || !f.latest) return null;
  const c = computeChange(f.msp.price, f.latest.price);
  if (!c) return null;
  const season =
    `${f.msp.season === "rabi" ? "रबी " : f.msp.season === "kharif" ? "खरीफ " : ""}विपणन वर्ष ${f.msp.year}`.trim();
  const position =
    c.direction === "flat"
      ? "उसके बराबर"
      : `उससे ${formatPercent(c.percent)} ${c.direction === "up" ? "ऊपर" : "नीचे"}`;
  const variants = [
    `${season} के लिए न्यूनतम समर्थन मूल्य (एमएसपी) ${r(f.msp.price)} प्रति क्विंटल है। ताज़ा बाज़ार भाव ${position} है।`,
    `${r(f.msp.price)} के सरकारी एमएसपी (${season}) के मुकाबले, ${d(f.latest.date)} का भाव ${position} बैठता है।`,
    `${season} का एमएसपी ${r(f.msp.price)} प्रति क्विंटल तय हुआ; ${d(f.latest.date)} को बाज़ार भाव ${position} था। एमएसपी सरकारी खरीद पर लागू होता है, हर मंडी बिक्री पर नहीं।`,
  ];
  return pickVariant(f.slug, "msp", variants);
}

function exports(f: CopyFacts): string | null {
  const e = f.exports;
  if (!e) return null;
  const trend =
    e.previousValue !== undefined && e.previousYear
      ? (() => {
          const c = computeChange(e.previousValue, e.latestValue);
          if (!c) return null;
          return c.direction === "flat"
            ? `${e.previousYear} जितना ही`
            : `${e.previousYear} के ${formatUsdMillion(e.previousValue)} से ${formatPercent(c.percent)} ${c.direction === "up" ? "ऊपर" : "नीचे"}`;
        })()
      : null;
  const top =
    e.topCountry && e.topCountryValue !== undefined
      ? `${e.topCountry} (${formatUsdMillion(e.topCountryValue)})`
      : null;
  const variants = [
    `${e.latestYear} में भारत से “${e.group}” श्रेणी का निर्यात ${formatUsdMillion(e.latestValue)} का रहा${trend ? `, ${trend}` : ""}।${top ? ` सबसे बड़ा खरीदार ${top} रहा।` : ""}`,
    `आधिकारिक व्यापार आँकड़ों के अनुसार ${e.latestYear} में “${e.group}” का निर्यात ${formatUsdMillion(e.latestValue)} था।${trend ? ` यह ${trend} है।` : ""}${top ? ` सबसे ज़्यादा ${top.split(" (")[0]} ने खरीदा।` : ""}`,
    `“${e.group}” का कुल निर्यात ${e.latestYear} में ${formatUsdMillion(e.latestValue)} रहा${top ? `; सबसे बड़ा गंतव्य ${top} था` : ""}${trend ? `, ${trend}` : ""}।`,
  ];
  const note = e.verified ? "" : " यह निर्यात श्रेणी फसल से अपने आप जोड़ी गई है और अभी जाँची नहीं गई।";
  return (
    pickVariant(f.slug, "exports", variants) +
    ` निर्यात के आँकड़े सालाना होते हैं और देरी से प्रकाशित होते हैं।${note}`
  );
}

/** 2–4 paragraphs for a page, in the same order as the English copy. */
export function buildPageCopyHi(facts: CopyFacts): string[] {
  return [headline(facts), change(facts), spread(facts), msp(facts), exports(facts)]
    .filter((p): p is string => p !== null)
    .slice(0, 4);
}
