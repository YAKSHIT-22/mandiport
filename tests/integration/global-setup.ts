import { loadLocalEnv } from "./load-env";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDb, createPool } from "@/lib/db";

/** Migrates the test database once per run. Needs DATABASE_URL_TEST. */
export default async function setup() {
  loadLocalEnv();
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error("DATABASE_URL_TEST is required for integration tests");
  if (url === process.env.DATABASE_URL) throw new Error("DATABASE_URL_TEST must differ from DATABASE_URL");
  const pool = createPool(url, 1);
  try {
    await migrate(createDb(pool), { migrationsFolder: "./drizzle" });
  } finally {
    await pool.end();
  }
}
