/**
 * data.gov.in field names are inconsistent: JSON uses ids like `min_price`, CSV headers use
 * names like `Min_x0020_Price` (`_x0020_` is an XML-escaped space), and case varies between
 * datasets. Normalizers only ever see keys passed through `normalizeFieldName`.
 */
export function normalizeFieldName(name: string): string {
  return name
    .replace(/_x0020_/gi, "_")
    .trim()
    .replace(/[\s\-.]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();
}

export function normalizeRecordKeys(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    out[normalizeFieldName(key)] = value;
  }
  return out;
}
