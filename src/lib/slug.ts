/** Clean, lowercase, hyphenated slugs (SPEC §9.1). ASCII only; names with no Latin letters become "item". */
export function slugify(text: string): string {
  const slug = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return slug || "item";
}

/** Returns `slug`, or `slug-2`, `slug-3`… if already taken. Adds the result to `taken`. */
export function uniqueSlug(text: string, taken: Set<string>): string {
  const base = slugify(text);
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  taken.add(slug);
  return slug;
}

/**
 * Human display name from an Agmarknet source name: tidies spacing around brackets and
 * doubled brackets without changing words, e.g. "Rose(Loose))" → "Rose (Loose)".
 */
export function displayName(sourceName: string): string {
  return sourceName
    .replace(/\)+/g, ")")
    .replace(/\s*\(\s*/g, " (")
    .replace(/\s*\)/g, ")")
    .replace(/\)(?=[A-Za-z(])/g, ") ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}
