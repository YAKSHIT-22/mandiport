import { existsSync } from "node:fs";

/** Next's env loader skips .env.local when NODE_ENV=test; load it directly (CI passes real env vars). */
export function loadLocalEnv() {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
}
