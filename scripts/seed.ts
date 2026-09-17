/** Seeds categories (SPEC §6.5) and states seen in real data (tests/fixtures/names/states.json). */
import { sql } from "drizzle-orm";
import rules from "../data/category-rules.json";
import stateNames from "../tests/fixtures/names/states.json";
import { categories, states } from "@/lib/db/schema";
import { uniqueSlug } from "@/lib/slug";
import { logger, runScript } from "./lib/context";

runScript("seed", async ({ db }) => {
  for (const c of rules.categories) {
    await db
      .insert(categories)
      .values({ name: c.name, slug: c.slug, sortOrder: c.sortOrder })
      .onConflictDoUpdate({ target: categories.slug, set: { name: c.name, sortOrder: c.sortOrder } });
  }
  const taken = new Set(
    (await db.execute<{ slug: string }>(sql`select slug from states`)).rows.map((r) => r.slug),
  );
  const existing = new Set(
    (await db.execute<{ name: string }>(sql`select name from states`)).rows.map((r) => r.name),
  );
  const missing = stateNames.raw.map((n) => n.trim()).filter((n) => !existing.has(n));
  if (missing.length > 0) {
    await db
      .insert(states)
      .values(missing.map((name) => ({ name, slug: uniqueSlug(name, taken) })))
      .onConflictDoNothing();
  }
  logger.info("seeded", { categories: rules.categories.length, statesAdded: missing.length });
});
