import { and, desc, eq, sql } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { ingestRejects, ingestRuns } from "@/lib/db/schema";

export type RunStatus = "running" | "success" | "partial" | "failed";

export interface RunCheckpoint {
  /** Partition keys already written. */
  done?: string[];
  [key: string]: unknown;
}

const MAX_REJECTS_PER_RUN = 2_000;

/** One row in ingest_runs, written on every run, success or failure (SPEC §6.7). */
export class IngestRun {
  private rejectsStored = 0;
  rowsFetched = 0;
  rowsUpserted = 0;
  rowsRejected = 0;

  private constructor(
    private readonly db: Db,
    readonly id: number,
    readonly job: string,
    public checkpoint: RunCheckpoint,
    readonly resumed: boolean,
  ) {}

  /**
   * Starts a run. If the latest run of the same job and params did not succeed, its
   * checkpoint is carried over so finished partitions are skipped.
   */
  static async start(db: Db, job: string, params: Record<string, unknown> = {}): Promise<IngestRun> {
    const [previous] = await db
      .select()
      .from(ingestRuns)
      .where(and(eq(ingestRuns.job, job), sql`${ingestRuns.params} = ${JSON.stringify(params)}::jsonb`))
      .orderBy(desc(ingestRuns.startedAt))
      .limit(1);

    const resumable = previous !== undefined && previous.status !== "success";
    const checkpoint = (resumable ? previous.checkpoint : {}) as RunCheckpoint;
    const [row] = await db
      .insert(ingestRuns)
      .values({ job, params, checkpoint, status: "running" })
      .returning({ id: ingestRuns.id });
    return new IngestRun(db, row!.id, job, checkpoint, resumable);
  }

  isDone(partitionKey: string): boolean {
    return this.checkpoint.done?.includes(partitionKey) ?? false;
  }

  async markDone(partitionKey: string): Promise<void> {
    this.checkpoint = { ...this.checkpoint, done: [...(this.checkpoint.done ?? []), partitionKey] };
    await this.save();
  }

  async save(): Promise<void> {
    await this.db
      .update(ingestRuns)
      .set({
        checkpoint: this.checkpoint,
        rowsFetched: this.rowsFetched,
        rowsUpserted: this.rowsUpserted,
        rowsRejected: this.rowsRejected,
      })
      .where(eq(ingestRuns.id, this.id));
  }

  async reject(items: { raw: unknown; reason: string }[]): Promise<void> {
    this.rowsRejected += items.length;
    const room = MAX_REJECTS_PER_RUN - this.rejectsStored;
    const toStore = items.slice(0, Math.max(0, room));
    if (toStore.length === 0) return;
    this.rejectsStored += toStore.length;
    await this.db
      .insert(ingestRejects)
      .values(toStore.map((item) => ({ runId: this.id, raw: item.raw as object, reason: item.reason })));
  }

  async finish(status: Exclude<RunStatus, "running">, error?: unknown): Promise<void> {
    await this.db
      .update(ingestRuns)
      .set({
        status,
        finishedAt: new Date(),
        checkpoint: this.checkpoint,
        rowsFetched: this.rowsFetched,
        rowsUpserted: this.rowsUpserted,
        rowsRejected: this.rowsRejected,
        error: error === undefined ? null : error instanceof Error ? error.message : String(error),
      })
      .where(eq(ingestRuns.id, this.id));
  }
}
