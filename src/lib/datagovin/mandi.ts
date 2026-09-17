import { normalizeRecordKeys } from "./fields";
import { cleanText, parseDdMmYyyy, parsePrice } from "./parse";

/**
 * Normalizer for "Current Daily Price of Various Commodities from Various Markets (Mandi)",
 * resource 9ef84268-d588-465a-a308-a864a43d0070. Fields verified 2026-09-17, see
 * tests/fixtures/fields/mandi-daily.json. Note: no trading volume in this dataset.
 */

export interface MandiPriceRecord {
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety: string | null;
  grade: string | null;
  /** YYYY-MM-DD */
  arrivalDate: string;
  /** ₹/quintal */
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
}

export type RejectReason =
  | "missing_state"
  | "missing_district"
  | "missing_market"
  | "missing_commodity"
  | "invalid_arrival_date"
  | "invalid_min_price"
  | "invalid_max_price"
  | "invalid_modal_price"
  | "min_above_max"
  | "modal_outside_range";

export type NormalizeResult =
  { ok: true; value: MandiPriceRecord } | { ok: false; reason: RejectReason; raw: Record<string, unknown> };

export function normalizeMandiRecord(raw: Record<string, unknown>): NormalizeResult {
  const r = normalizeRecordKeys(raw);
  const reject = (reason: RejectReason): NormalizeResult => ({ ok: false, reason, raw });

  const state = cleanText(r.state);
  if (!state) return reject("missing_state");
  const district = cleanText(r.district);
  if (!district) return reject("missing_district");
  const market = cleanText(r.market);
  if (!market) return reject("missing_market");
  const commodity = cleanText(r.commodity);
  if (!commodity) return reject("missing_commodity");

  const arrivalDate = parseDdMmYyyy(r.arrival_date);
  if (!arrivalDate) return reject("invalid_arrival_date");

  const minPrice = parsePrice(r.min_price);
  if (minPrice === null) return reject("invalid_min_price");
  const maxPrice = parsePrice(r.max_price);
  if (maxPrice === null) return reject("invalid_max_price");
  const modalPrice = parsePrice(r.modal_price);
  if (modalPrice === null) return reject("invalid_modal_price");
  if (minPrice > maxPrice) return reject("min_above_max");
  if (modalPrice < minPrice || modalPrice > maxPrice) return reject("modal_outside_range");

  return {
    ok: true,
    value: {
      state,
      district,
      market,
      commodity,
      variety: cleanText(r.variety),
      grade: cleanText(r.grade),
      arrivalDate,
      minPrice,
      maxPrice,
      modalPrice,
    },
  };
}
