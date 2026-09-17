import { getEnv, requireEnv } from "@/env";
import { DataGovInClient } from "@/lib/datagovin";
import { closeDb, getDb } from "@/lib/db";
import { logger } from "./log";

/** Gateway allows ~60 requests/minute (DECISIONS D-005). */
export const REQUEST_INTERVAL_MS = 1_100;

export function createClient() {
  return new DataGovInClient({
    apiKey: requireEnv("DATAGOVIN_API_KEY"),
    logger,
    minRequestIntervalMs: REQUEST_INTERVAL_MS,
  });
}

export function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((a) => a.startsWith(prefix))?.slice(prefix.length);
}

export function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

/** Runs a script body with a DB connection, structured errors and a clean exit code. */
export function runScript(
  name: string,
  body: (ctx: { env: ReturnType<typeof getEnv>; db: ReturnType<typeof getDb> }) => Promise<void>,
) {
  const started = Date.now();
  body({ env: getEnv(), db: getDb() })
    .then(() => logger.info(`${name} finished`, { durationMs: Date.now() - started }))
    .catch((error: unknown) => {
      logger.error(`${name} failed`, {
        error: error instanceof Error ? (error.stack ?? error.message) : String(error),
      });
      process.exitCode = 1;
    })
    .finally(() => closeDb());
}

export { logger };
