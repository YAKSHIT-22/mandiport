import synonyms from "../../../data/commodity-synonyms.json";

/**
 * Export mapping suggestions (SPEC §6.6). Pure function; the script persists results as
 * status "suggested" and never touches human-reviewed rows or HS codes.
 */

export interface MappingCandidate {
  exportKey: string;
  confidence: number;
  reason: string;
}

export interface CommodityForMapping {
  sourceName: string;
  categorySlug: string | null;
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function tokens(s: string): Set<string> {
  return new Set(
    normalize(s)
      .split(" ")
      .filter((t) => t.length > 2),
  );
}

/** Dice coefficient over word tokens. */
export function tokenSimilarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let common = 0;
  for (const t of ta) if (tb.has(t)) common++;
  return (2 * common) / (ta.size + tb.size);
}

export function suggestExportMappings(
  commodity: CommodityForMapping,
  exportCommodities: { key: string; displayName: string }[],
): MappingCandidate[] {
  const available = new Set(exportCommodities.map((c) => c.key));
  const candidates = new Map<string, MappingCandidate>();
  const add = (candidate: MappingCandidate) => {
    if (!available.has(candidate.exportKey)) return;
    const existing = candidates.get(candidate.exportKey);
    if (!existing || existing.confidence < candidate.confidence)
      candidates.set(candidate.exportKey, candidate);
  };

  // 1. Curated synonym groups: most specific export key first.
  for (const group of synonyms.groups) {
    if (!group.mandiNames.includes(commodity.sourceName)) continue;
    group.exportKeys.forEach((exportKey, index) =>
      add({
        exportKey,
        confidence: Math.max(0.5, 0.9 - index * 0.2),
        reason: `synonyms group "${group.key}"`,
      }),
    );
  }

  // 2. Name similarity with export commodity names (e.g. "Wheat" ↔ "WHEAT").
  for (const exp of exportCommodities) {
    const score = Math.max(
      tokenSimilarity(commodity.sourceName, exp.displayName),
      tokenSimilarity(commodity.sourceName, exp.key),
    );
    if (score >= 0.5)
      add({
        exportKey: exp.key,
        confidence: Math.round(score * 0.8 * 1000) / 1000,
        reason: "name similarity",
      });
  }

  // 3. Category fallback, e.g. vegetables → FRESH VEGETABLES (a broad group: low confidence).
  const fallback = commodity.categorySlug
    ? (synonyms.categoryFallback as Record<string, string>)[commodity.categorySlug]
    : undefined;
  if (fallback && candidates.size === 0)
    add({ exportKey: fallback, confidence: 0.35, reason: `category fallback (${commodity.categorySlug})` });

  return [...candidates.values()].sort((a, b) => b.confidence - a.confidence);
}
