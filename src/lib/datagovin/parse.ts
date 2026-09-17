/**
 * Explicit converters for values as data.gov.in publishes them. Every function returns
 * `null` for anything it cannot convert with certainty; callers turn `null` into a reject.
 */

const DATE_RE = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;

/** "17/09/2026" → "2026-09-17". Rejects impossible dates such as 31/02/2026. */
export function parseDdMmYyyy(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = DATE_RE.exec(value.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || year < 1990 || year > 2100) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Price in ₹/quintal as a positive integer. Accepts numbers or strings such as "4,800",
 * "₹ 4800.00" or " 4800 ". Zero, negatives, blanks and placeholders ("NR", "-") are rejected.
 */
export function parsePrice(value: unknown): number | null {
  let n: number;
  if (typeof value === "number") {
    n = value;
  } else if (typeof value === "string") {
    const cleaned = value.replace(/[₹,\s]/g, "").replace(/^Rs\.?/i, "");
    if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
    n = Number(cleaned);
  } else {
    return null;
  }
  if (!Number.isFinite(n) || n <= 0) return null;
  const rounded = Math.round(n);
  return rounded > 0 && rounded <= 2_000_000_000 ? rounded : null;
}

/** Trims and collapses internal whitespace. Empty strings become null. */
export function cleanText(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).replace(/\s+/g, " ").trim();
  return text === "" ? null : text;
}
