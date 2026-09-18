import { normalizeRecordKeys } from "./fields";
import { cleanText } from "./parse";

/**
 * Normalizer for "Principal Commodity wise Export" resources (Department of Commerce, one
 * per financial year). Field names differ in every era of the series (verified 2026-09-18):
 *   2014-15 to 2016-17: pc_description, cty_desc, qty, val_usd_million_
 *   2017-18:            commodity, country, qty, values_us_million_, unit_code
 *   2018-19 to 2019-20: commodity, country, quantity_, value_us_million_
 *   2021-22 to 2022-23: principle_commodity, country, quantity_, value_us__million_
 * Values can be numbers or strings, and names vary slightly ("RICE -BASMOTI" / "RICE BASMOTI").
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

/** Finds the commodity, country, quantity, value or unit field whatever the year's naming. */
export function findExportField(
  keys: string[],
  kind: "commodity" | "country" | "quantity" | "value" | "unit",
): string | undefined {
  const pick = (test: (name: string) => boolean) => keys.find((key) => test(key.toLowerCase()));
  switch (kind) {
    case "commodity":
      return pick((n) => (n.includes("commodity") || n.includes("pc_description")) && !n.endsWith("_code"));
    case "country":
      return pick((n) => (n.includes("country") || n.startsWith("cty")) && !n.endsWith("_code"));
    case "quantity":
      return pick((n) => n === "qty" || n.startsWith("quantity"));
    case "value":
      return pick((n) => (n.startsWith("val") || n.includes("value")) && n.includes("million"));
    case "unit":
      return pick((n) => n === "unit" || n === "unit_code");
  }
}

export function normalizeExportRow(
  raw: Record<string, unknown>,
): { ok: true; value: ExportRecord } | { ok: false; reject: ExportReject } {
  const r = normalizeRecordKeys(raw);
  const keys = Object.keys(r);
  const field = (kind: Parameters<typeof findExportField>[1]) => r[findExportField(keys, kind) ?? ""];

  const commodityName = cleanText(field("commodity"));
  if (!commodityName) return { ok: false, reject: { raw, reason: "missing_commodity" } };
  const country = cleanText(field("country"));
  if (!country) return { ok: false, reject: { raw, reason: "missing_country" } };

  const value = toNumber(field("value"));
  if (value === null || value < 0) return { ok: false, reject: { raw, reason: "invalid_value" } };
  const quantity = toNumber(field("quantity"));

  return {
    ok: true,
    value: {
      commodityKey: exportKey(commodityName),
      commodityName,
      country,
      unit: cleanText(field("unit")),
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
