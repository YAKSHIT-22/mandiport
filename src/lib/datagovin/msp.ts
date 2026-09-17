import mspMap from "../../../data/msp-commodities.json";
import { normalizeRecordKeys } from "./fields";
import { cleanText, parsePrice } from "./parse";

/**
 * Normalizers for the wide MSP tables (verified 2026-09-17):
 * - 82e89d31…: Commodity, Category ("Kharif Crops" | "Rabi Crops" | "Other Crops"), Variety,
 *   one column per crop year ("2013-14" → field `__2013_14` / `_2017_18`). Values may be "NA".
 * - b45f166a…: Commodities, one column per rabi marketing season ("RMS 2025-26" → `rms_2025_26`).
 *
 * Output years are marketing seasons: kharif crop year X = KMS X; rabi crop year X = RMS X+1.
 */

export interface MspRecord {
  canonicalName: string;
  variety: string | null;
  /** Mandi commodity source name to compare against, or null. */
  mandiName: string | null;
  season: "kharif" | "rabi" | "other";
  /** Marketing season label, e.g. "2025-26". */
  year: string;
  mspPrice: number;
}

export type MspReject = { raw: Record<string, unknown>; reason: string };

const YEAR_FIELD = /^(rms_)?_*(\d{4})_(\d{2})$/;

export function shiftYearLabel(label: string, by: number): string {
  const [start, end] = label.split("-").map(Number);
  return `${start! + by}-${String((end! + by) % 100).padStart(2, "0")}`;
}

function findEntry(published: string, variety: string | null) {
  const name = published.trim().toLowerCase();
  const v = variety?.trim().toLowerCase() ?? null;
  return mspMap.entries.find(
    (e) =>
      e.published.some((p) => p.toLowerCase() === name) &&
      (e.variety === null ? v === null : e.variety.toLowerCase() === v),
  );
}

export function normalizeMspRows(rawRows: Record<string, unknown>[]): {
  records: MspRecord[];
  rejects: MspReject[];
} {
  const records: MspRecord[] = [];
  const rejects: MspReject[] = [];

  for (const raw of rawRows) {
    const r = normalizeRecordKeys(raw);
    const published = cleanText(r.commodity ?? r.commodities);
    if (!published) {
      rejects.push({ raw, reason: "missing_commodity" });
      continue;
    }
    const varietyText = cleanText(r.variety);
    const variety = varietyText && varietyText.toUpperCase() !== "NA" ? varietyText : null;
    const category = cleanText(r.category)?.toLowerCase() ?? null;

    const entry = findEntry(published, variety);
    if (!entry) {
      rejects.push({ raw, reason: `unmapped_msp_name:${published}${variety ? `/${variety}` : ""}` });
      continue;
    }

    for (const [field, value] of Object.entries(r)) {
      const match = YEAR_FIELD.exec(field);
      if (!match) continue;
      const isRms = Boolean(match[1]);
      const label = `${match[2]}-${match[3]}`;
      const price = parsePrice(value);
      if (price === null) continue; // "NA": no MSP that year

      let season: MspRecord["season"];
      let year: string;
      if (isRms) {
        season = "rabi";
        year = label;
      } else if (category?.startsWith("kharif")) {
        season = "kharif";
        year = label;
      } else if (category?.startsWith("rabi")) {
        season = "rabi";
        year = shiftYearLabel(label, 1);
      } else {
        season = "other";
        year = label;
      }
      records.push({
        canonicalName: entry.canonical,
        variety,
        mandiName: entry.mandi,
        season,
        year,
        mspPrice: price,
      });
    }
  }

  // The two tables overlap for rabi crops; identical values collapse, conflicts are rejected.
  const byKey = new Map<string, MspRecord>();
  for (const record of records) {
    const k = [record.canonicalName, record.variety, record.season, record.year].join("|");
    const existing = byKey.get(k);
    if (existing && existing.mspPrice !== record.mspPrice) {
      rejects.push({
        raw: { ...record, conflictsWith: existing.mspPrice },
        reason: "conflicting_msp_values",
      });
      continue;
    }
    byKey.set(k, record);
  }
  return { records: [...byKey.values()], rejects };
}
