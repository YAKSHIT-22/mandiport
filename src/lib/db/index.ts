import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { requireEnv } from "@/env";
import * as schema from "./schema";

/**
 * One pg Pool per process. The same driver serves local Postgres and Neon (use Neon's
 * pooled connection string in production). See DECISIONS.md D-012.
 */

export type Db = NodePgDatabase<typeof schema>;

declare global {
  // Reuse the pool across Next.js dev hot reloads.
  var __mandiportPool: Pool | undefined;
}

export function createPool(connectionString: string, max = 5): Pool {
  const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);
  return new Pool({
    connectionString,
    max,
    idleTimeoutMillis: 10_000,
    ssl: isLocal ? undefined : { rejectUnauthorized: true },
  });
}

export function createDb(pool: Pool): Db {
  return drizzle(pool, { schema });
}

let db: Db | undefined;

export function getDb(): Db {
  if (!db) {
    globalThis.__mandiportPool ??= createPool(requireEnv("DATABASE_URL"));
    db = createDb(globalThis.__mandiportPool);
  }
  return db;
}

export async function closeDb(): Promise<void> {
  await globalThis.__mandiportPool?.end();
  globalThis.__mandiportPool = undefined;
  db = undefined;
}

export { schema };
