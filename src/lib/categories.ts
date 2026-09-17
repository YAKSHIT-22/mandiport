import rulesFile from "../../data/category-rules.json";

/**
 * Suggests a category for a commodity name (SPEC §6.5). Suggestions are never final: they
 * are stored with category_confirmed=false until a human confirms them in the admin page.
 */

export type CategorySlug = (typeof rulesFile.categories)[number]["slug"];

interface CategoryRules {
  exact: Record<string, string>;
  rules: { category: string; keywords: string[] }[];
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function prepare(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

export function compileCategoryRules(file: CategoryRules) {
  const exact = new Map(Object.entries(file.exact).map(([name, slug]) => [name.trim().toLowerCase(), slug]));
  const rules = file.rules.map((rule) => ({
    category: rule.category,
    // Whole-word match; spaces and punctuation such as "(" "/" "-" "," separate words.
    patterns: rule.keywords.map(
      (k) => new RegExp(`(^|[\\s(/\\-,])${escapeRegExp(k.toLowerCase())}(?=$|[\\s()/\\-,])`),
    ),
  }));

  return function suggestCategory(name: string): string | null {
    const exactMatch = exact.get(name.trim().toLowerCase());
    if (exactMatch) return exactMatch;
    const text = prepare(name);
    for (const rule of rules) {
      if (rule.patterns.some((pattern) => pattern.test(text))) return rule.category;
    }
    return null;
  };
}

export const categories = rulesFile.categories;
export const suggestCategory = compileCategoryRules(rulesFile);
