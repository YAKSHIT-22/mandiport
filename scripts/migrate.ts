/** Applies SQL migrations in ./drizzle to DATABASE_URL (or --test for DATABASE_URL_TEST). */
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getEnv, requireEnv } from "@/env";
import { createDb, createPool } from "@/lib/db";
import { logger } from "./lib/log";

async function main() {
  const test = process.argv.includes("--test");
  const url = test ? requireEnv("DATABASE_URL_TEST", getEnv()) : requireEnv("DATABASE_URL");
  const pool = createPool(url, 1);
  try {
    await migrate(createDb(pool), { migrationsFolder: "./drizzle" });
    logger.info("migrations applied", { database: new URL(url).pathname.slice(1) });
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  logger.error("migration failed", { error: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
