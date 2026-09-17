import { sql } from "drizzle-orm";
import type { Pool } from "pg";
import rules from "../../data/category-rules.json";
import { createDb, createPool, type Db } from "@/lib/db";
import { categories } from "@/lib/db/schema";

let pool: Pool | undefined;
let db: Db | undefined;

export function testDb(): Db {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error("DATABASE_URL_TEST is not set");
  pool ??= createPool(url, 4);
  db ??= createDb(pool);
  return db;
}

export async function closeTestDb() {
  await pool?.end();
  pool = undefined;
  db = undefined;
}

/** Empties every application table and reseeds categories. */
export async function resetDb(): Promise<Db> {
  const d = testDb();
  const tables = await d.execute<{ tablename: string }>(
    sql`select tablename from pg_tables where schemaname = 'public'`,
  );
  const names = tables.rows.map((t) => `"${t.tablename}"`).join(", ");
  await d.execute(sql.raw(`truncate ${names} restart identity cascade`));
  await d
    .insert(categories)
    .values(rules.categories.map((c) => ({ name: c.name, slug: c.slug, sortOrder: c.sortOrder })));
  return d;
}
