/** Prints how the category rules classify the real commodity names in tests/fixtures/names/. */
import commodities from "../tests/fixtures/names/commodities.json";
import { suggestCategory } from "@/lib/categories";

const groups = new Map<string, string[]>();
for (const { name } of commodities.commodities) {
  const category = suggestCategory(name) ?? "(unmatched)";
  groups.set(category, [...(groups.get(category) ?? []), name]);
}
for (const [category, names] of [...groups.entries()].sort()) {
  console.log(`\n${category} (${names.length}): ${names.sort().join(" | ")}`);
}
