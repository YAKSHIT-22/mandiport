import type { Logger } from "@/lib/datagovin";
import type { Db } from "@/lib/db";

export interface AfterIngestContext {
  db: Db;
  logger: Logger;
  dates: string[];
  commodityIds: number[];
}

type Step = (ctx: AfterIngestContext) => Promise<void>;

const steps: { name: string; run: Step }[] = [];

/** Registers a post-ingest step: cache invalidation, page revalidation, alerts (SPEC §6.7). */
export function registerAfterIngestStep(name: string, run: Step) {
  steps.push({ name, run });
}

/** Runs every registered step; a failing step is logged and does not block the others. */
export async function afterIngest(ctx: AfterIngestContext): Promise<void> {
  if (ctx.dates.length === 0) return;
  for (const step of steps) {
    try {
      await step.run(ctx);
    } catch (error) {
      ctx.logger.warn("post-ingest step failed", {
        step: step.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
