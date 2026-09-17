import type { Filters } from "@/lib/datagovin";

type Row = Record<string, unknown>;

export interface FakeApiOptions {
  maxWindow?: number;
  /** Return rows in a different order on every request, like the real API. */
  unstableOrder?: boolean;
}

/**
 * In-memory stand-in for api.data.gov.in with the verified behaviours: exact `.keyword`
 * filters, loose plain filters, result window errors as HTTP 200 + status "error".
 */
export function createFakeApi(rows: Row[], options: FakeApiOptions = {}) {
  const maxWindow = options.maxWindow ?? 10_000;
  const calls: { offset: number; limit: number; filters: Filters }[] = [];
  let failWhen: ((filters: Filters) => boolean) | undefined;

  const fetchImpl = (async (input: string | URL) => {
    const url = new URL(String(input));
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const limit = Number(url.searchParams.get("limit") ?? 10);
    const filters: Filters = {};
    for (const [key, value] of url.searchParams) {
      const match = /^filters\[(.+)\]$/.exec(key);
      if (match?.[1]) filters[match[1]] = value;
    }
    calls.push({ offset, limit, filters });
    if (failWhen?.(filters)) return new Response("gateway error", { status: 400 });

    if (offset + limit > maxWindow) {
      return Response.json({
        status: "error",
        message: `Result window is too large, from + size must be less than or equal to: [${maxWindow}]`,
      });
    }

    const matching = rows.filter((row) =>
      Object.entries(filters).every(([field, value]) => {
        if (field.endsWith(".keyword")) {
          // Real API: `<lowercase field>.keyword` matches regardless of the record key's case;
          // a capitalised keyword name (`State.keyword`) matches nothing.
          const name = field.slice(0, -8);
          if (name !== name.toLowerCase()) return false;
          const k = Object.keys(row).find((key) => key.toLowerCase() === name);
          return k !== undefined && String(row[k]) === value;
        }
        const actual = String(row[field] ?? "");
        return actual.split(" ").some((word) => value.split(" ").includes(word));
      }),
    );
    if (options.unstableOrder) {
      // Deterministic per-call rotation + reversal: same rows, different order each request.
      const shift = (calls.length * 7) % Math.max(1, matching.length);
      matching.push(...matching.splice(0, shift));
      if (calls.length % 2 === 0) matching.reverse();
    }
    return Response.json({
      status: "ok",
      total: matching.length,
      count: Math.max(0, Math.min(limit, matching.length - offset)),
      field: [],
      field_exposed: [],
      records: matching.slice(offset, offset + limit),
    });
  }) as typeof fetch;

  return {
    fetch: fetchImpl,
    calls,
    /** Makes matching requests fail with a non-retryable HTTP 400 until cleared. */
    failRequests(predicate: ((filters: Filters) => boolean) | undefined) {
      failWhen = predicate;
    },
    /** Replace the served rows (e.g. to simulate late reports). */
    setRows(next: Row[]) {
      rows.splice(0, rows.length, ...next);
    },
  };
}

export const noSleep = async () => {};
