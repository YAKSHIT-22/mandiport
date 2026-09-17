import { normalizeRecordKeys } from "./fields";
import { cleanText } from "./parse";

/**
 * Normalizer for "Principal Commodity wise Export" resources (Department of Commerce, one
 * per financial year). Verified 2026-09-17: field names vary by year
 * (`principle_commodity` / `commodity`, `value_us__million_` / `value_us_million_`), values
 * can be numbers or strings, names vary slightly ("RICE -BASMOTI" / "RICE BASMOTI").
 */

export interface ExportRecord {
  /** Normalized commodity key, e.g. "RICE BASMOTI". */
  commodityKey: string;
  commodityName: string;
  country: string;
  unit: string | null;
  quantity: number | null;
  valueUsdMillion: number;
}

export type ExportReject = { raw: Record<string, unknown>; reason: string };

export function exportKey(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/,/g, "").trim();
  if (cleaned === "" || !/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  return Number(cleaned);
}

export function normalizeExportRow(
  raw: Record<string, unknown>,
): { ok: true; value: ExportRecord } | { ok: false; reject: ExportReject } {
  const r = normalizeRecordKeys(raw);
  const commodityName = cleanText(r.principle_commodity ?? r.principal_commodity ?? r.commodity);
  if (!commodityName) return { ok: false, reject: { raw, reason: "missing_commodity" } };
  const country = cleanText(r.country);
  if (!country) return { ok: false, reject: { raw, reason: "missing_country" } };

  const valueField = Object.keys(r).find((k) => k.startsWith("value"));
  const value = valueField ? toNumber(r[valueField]) : null;
  if (value === null || value < 0) return { ok: false, reject: { raw, reason: "invalid_value" } };
  const quantityField = Object.keys(r).find((k) => k.startsWith("quantity"));
  const quantity = quantityField ? toNumber(r[quantityField]) : null;

  return {
    ok: true,
    value: {
      commodityKey: exportKey(commodityName),
      commodityName,
      country,
      unit: cleanText(r.unit),
      quantity: quantity !== null && quantity >= 0 ? quantity : null,
      valueUsdMillion: value,
    },
  };
}

const COUNTRY_NAMES: Record<string, string> = {
  "U S A": "United States",
  USA: "United States",
  "U K": "United Kingdom",
  "U ARAB EMTS": "United Arab Emirates",
  UAE: "United Arab Emirates",
  "SAUDI ARAB": "Saudi Arabia",
  NETHERLAND: "Netherlands",
  "KOREA RP": "South Korea",
  "KOREA DP RP": "North Korea",
  RUSSIA: "Russia",
  "CHINA P RP": "China",
  "HONG KONG": "Hong Kong",
  "VIETNAM SOC REP": "Vietnam",
  IRAN: "Iran",
  "TANZANIA REP": "Tanzania",
  "CZECH REPUBLIC": "Czech Republic",
  "BOSNIA-HRZGOVIN": "Bosnia and Herzegovina",
  "DOMINIC REP": "Dominican Republic",
  UNSPECIFIED: "Unspecified",
};

/** Readable country name. Known abbreviations are expanded; others are title-cased as published. */
export function countryDisplayName(published: string): string {
  const exact = COUNTRY_NAMES[published.trim().toUpperCase()];
  if (exact) return exact;
  return published
    .trim()
    .toLowerCase()
    .replace(/\b([a-z])/g, (c) => c.toUpperCase());
}
