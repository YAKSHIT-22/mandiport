import { describe, expect, it } from "vitest";
import { buildPageCopy, pickVariant, stableHash, type CopyFacts } from "@/lib/seo/copy";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  datasetJsonLd,
  organizationJsonLd,
  serializeJsonLd,
  websiteJsonLd,
} from "@/lib/seo/jsonld";
import { clampText, pageMetadata } from "@/lib/seo/metadata";
import { hubIndexable, waveIncludes } from "@/lib/seo/indexing";
import { sitemapIndexXml, urlsetXml } from "@/lib/seo/sitemap";

const facts: CopyFacts = {
  slug: "onion",
  crop: "Onion",
  place: "India",
  latest: { price: 2450, date: "2026-09-16", markets: 412 },
  weekAgo: { price: 2270, date: "2026-09-09" },
  monthAgo: { price: 2540, date: "2026-08-17" },
  highest: { market: "Lasalgaon (Maharashtra)", price: 3100, date: "2026-09-16" },
  lowest: { market: "Kolar (Karnataka)", price: 900, date: "2026-09-15" },
  msp: null,
  exports: {
    group: "Fresh vegetables",
    latestYear: "2022-23",
    latestValue: 1234.5,
    previousYear: "2021-22",
    previousValue: 1000,
    topCountry: "Bangladesh",
    topCountryValue: 400,
    verified: false,
  },
};

describe("data-driven copy", () => {
  it("writes 2 to 4 paragraphs from real numbers", () => {
    const copy = buildPageCopy(facts);
    expect(copy.length).toBeGreaterThanOrEqual(2);
    expect(copy.length).toBeLessThanOrEqual(4);
    expect(copy.join(" ")).toContain("₹2,450");
    expect(copy.join(" ")).toContain("16 Sep 2026");
  });

  it("never prints undefined, NaN, null or empty values", () => {
    const variations: CopyFacts[] = [
      facts,
      { ...facts, weekAgo: null, monthAgo: null },
      { ...facts, highest: null, lowest: null },
      { ...facts, exports: null },
      { ...facts, latest: undefined },
      { ...facts, msp: { price: 2400, season: "kharif", year: "2024-25" } },
      { ...facts, latest: { price: 2450, date: "2026-09-16" } },
      { ...facts, weekAgo: { price: 2450, date: "2026-09-09" } },
    ];
    for (const v of variations) {
      for (const paragraph of buildPageCopy(v)) {
        expect(paragraph).not.toMatch(/undefined|NaN|null|—|\s,|\(\)/);
        expect(paragraph.trim()).toBe(paragraph);
        expect(paragraph.length).toBeGreaterThan(20);
      }
    }
  });

  it("says nothing at all without facts", () => {
    expect(buildPageCopy({ slug: "x", crop: "X", place: "India" })).toEqual([]);
  });

  it("marks unverified export mappings and the export lag", () => {
    const copy = buildPageCopy(facts).join(" ");
    expect(copy).toContain("annual and published with a lag");
    expect(copy).toContain("has not yet been reviewed");
  });

  it("picks a stable variant per slug and offers 6 of each", () => {
    const variants = ["a", "b", "c", "d", "e", "f"];
    expect(pickVariant("onion", "headline", variants)).toBe(pickVariant("onion", "headline", variants));
    const chosen = new Set(
      ["onion", "potato", "wheat", "tomato", "gram", "jute", "cotton", "maize"].map((s) =>
        pickVariant(s, "headline", variants),
      ),
    );
    expect(chosen.size).toBeGreaterThan(1);
    expect(stableHash("a")).not.toBe(stableHash("b"));
  });
});

describe("metadata", () => {
  it("clamps titles to 60 and descriptions to 155 characters", () => {
    const meta = pageMetadata({
      title: "Onion price today in mandis across every state of India with long extra words",
      description: "x".repeat(400),
      path: "/crops/onion",
    });
    const title = (meta.title as { absolute: string }).absolute;
    expect(title.length).toBeLessThanOrEqual(60);
    expect(meta.description!.length).toBeLessThanOrEqual(155);
    expect(meta.alternates!.canonical).toContain("/crops/onion");
  });

  it("does not cut mid-word when it can avoid it", () => {
    expect(clampText("Onion price today in mandis across India", 20)).toBe("Onion price today…");
    expect(clampText("short", 20)).toBe("short");
  });

  it("marks thin pages noindex, follow", () => {
    const meta = pageMetadata({ title: "t", description: "d", path: "/x", index: false });
    expect(meta.robots).toEqual({ index: false, follow: true });
  });
});

describe("JSON-LD", () => {
  it("builds Organization and WebSite with a search action", () => {
    expect(organizationJsonLd()["@type"]).toBe("Organization");
    const site = websiteJsonLd();
    expect(site["@type"]).toBe("WebSite");
    expect((site.potentialAction as Record<string, unknown>)["@type"]).toBe("SearchAction");
  });

  it("numbers breadcrumb items from 1", () => {
    const crumbs = breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Crops", path: "/crops" },
      { name: "Onion", path: "/crops/onion" },
    ]);
    const items = crumbs.itemListElement as { position: number; name: string; item: string }[];
    expect(items.map((i) => i.position)).toEqual([1, 2, 3]);
    expect(items[2]!.item).toMatch(/\/crops\/onion$/);
  });

  it("includes temporal and spatial coverage, licence and source agencies on Dataset", () => {
    const data = datasetJsonLd({
      name: "Onion mandi prices",
      description: "d",
      path: "/crops/onion",
      startDate: "2025-09-17",
      endDate: "2026-09-16",
      spatial: "India",
      datasets: ["mandiVariety", "mandiDaily"],
    });
    expect(data.temporalCoverage).toBe("2025-09-17/2026-09-16");
    expect(data.license).toMatch(/^https:\/\/www\.data\.gov\.in\//);
    expect((data.creator as unknown[]).length).toBeGreaterThan(0);
    expect((data.isBasedOn as string[]).every((u) => u.startsWith("https://api.data.gov.in/resource/"))).toBe(
      true,
    );
  });

  it("builds Article for briefs and escapes script-closing characters", () => {
    const article = articleJsonLd({
      headline: "h",
      description: "d",
      path: "/briefs/onion/2026-09-14",
      datePublished: "2026-09-15",
      dateModified: "2026-09-15",
    });
    expect(article["@type"]).toBe("Article");
    expect(serializeJsonLd({ a: "</script>" })).not.toContain("</script>");
  });
});

describe("indexing and sitemaps", () => {
  it("indexes tier 1 and 2 hubs only", () => {
    expect([hubIndexable(1), hubIndexable(2), hubIndexable(3)]).toEqual([true, true, false]);
  });

  it("adds tier 2 in wave 2 and markets in wave 3", () => {
    expect(waveIncludes(1)).toEqual({ hubTiers: [1], stateTiers: [1], markets: false });
    expect(waveIncludes(2).hubTiers).toEqual([1, 2]);
    expect(waveIncludes(3).markets).toBe(true);
  });

  it("writes valid sitemap XML with escaped URLs", () => {
    const xml = urlsetXml([{ path: "/crops/onion", lastModified: "2026-09-16" }, { path: "/crops/a&b" }]);
    expect(xml).toContain("<loc>");
    expect(xml).toContain("<lastmod>2026-09-16</lastmod>");
    expect(xml).toContain("a&amp;b");
    expect(sitemapIndexXml(["crops"])).toContain("/sitemaps/crops.xml");
  });
});
