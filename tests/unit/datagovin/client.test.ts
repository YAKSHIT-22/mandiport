import { describe, expect, it, vi } from "vitest";
import sample from "../../fixtures/datagovin/mandi-daily-sample.json";
import {
  DataGovInAuthError,
  DataGovInClient,
  DataGovInRateLimitError,
  DataGovInResourceNotFoundError,
  DataGovInResultWindowError,
  DataGovInTlsError,
  type ClientOptions,
} from "@/lib/datagovin";
import { createFakeApi } from "../../helpers/fake-datagovin";

const RESOURCE = "9ef84268-d588-465a-a308-a864a43d0070";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function makeClient(fetchImpl: typeof fetch, extra: Partial<ClientOptions> = {}) {
  const sleep = vi.fn(async (ms: number) => void ms);
  const logger = { info: vi.fn(), warn: vi.fn() };
  const client = new DataGovInClient({ apiKey: "test-key", fetch: fetchImpl, sleep, logger, ...extra });
  return { client, sleep, logger };
}

/** fetch that replays the given responses (or throws given errors) in order. */
function sequence(...steps: (Response | Error)[]) {
  const fn = vi.fn(async () => {
    const step = steps.shift();
    if (!step) throw new Error("no more responses");
    if (step instanceof Error) throw step;
    return step;
  });
  return fn as unknown as typeof fetch & typeof fn;
}

const okPage = (records: unknown[], total: number) => jsonResponse({ status: "ok", total, records });

describe("DataGovInClient.buildUrl", () => {
  it("encodes api key, paging and filters", () => {
    const { client } = makeClient(sequence());
    const url = new URL(
      client.buildUrl({
        resourceId: RESOURCE,
        offset: 200,
        limit: 100,
        filters: { "state.keyword": "Uttar Pradesh" },
      }),
    );
    expect(url.pathname).toBe(`/resource/${RESOURCE}`);
    expect(url.searchParams.get("api-key")).toBe("test-key");
    expect(url.searchParams.get("format")).toBe("json");
    expect(url.searchParams.get("offset")).toBe("200");
    expect(url.searchParams.get("filters[state.keyword]")).toBe("Uttar Pradesh");
  });

  it("refuses to start without an API key", () => {
    expect(() => new DataGovInClient({ apiKey: "" })).toThrow(DataGovInAuthError);
  });
});

describe("response formats", () => {
  it("parses a recorded JSON page with meta", async () => {
    const { client } = makeClient(
      sequence(
        jsonResponse({
          status: "ok",
          total: 16142,
          title: "Current Daily Price",
          updated_date: "2026-09-17T12:00:47Z",
          org: ["Ministry of Agriculture and Farmers Welfare"],
          field: [{ id: "state", name: "State", type: "keyword" }],
          field_exposed: [{ id: "state.keyword", name: "State", type: "keyword" }],
          records: sample,
        }),
      ),
    );
    const page = await client.fetchPage({ resourceId: RESOURCE, limit: 10 });
    expect(page.format).toBe("json");
    expect(page.total).toBe(16142);
    expect(page.records).toHaveLength(sample.length);
    expect(page.meta?.fieldsExposed[0]?.id).toBe("state.keyword");
  });

  it("parses CSV even though JSON was requested (by Content-Type)", async () => {
    const csv =
      "State,District,Market,Commodity,Variety,Grade,Arrival_Date,Min_x0020_Price,Max_x0020_Price,Modal_x0020_Price\n" +
      'Keralam,Kozhikode(Calicut),"Mukkom Market",Grapes,Other,Large,17/09/2026,8000,8500,8200\n';
    const { client } = makeClient(
      sequence(new Response(csv, { headers: { "content-type": "text/csv;charset=UTF-8" } })),
    );
    const page = await client.fetchPage({ resourceId: RESOURCE });
    expect(page.format).toBe("csv");
    expect(page.total).toBeNull();
    expect(page.records[0]).toMatchObject({ Market: "Mukkom Market", Modal_x0020_Price: "8200" });
  });

  it("detects CSV when Content-Type is missing or wrong", async () => {
    const { client } = makeClient(
      sequence(new Response("State,Market\nPunjab,Khanna\n", { headers: { "content-type": "text/plain" } })),
    );
    const page = await client.fetchPage({ resourceId: RESOURCE });
    expect(page.format).toBe("csv");
    expect(page.records).toEqual([{ State: "Punjab", Market: "Khanna" }]);
  });
});

describe("errors and retries", () => {
  it("retries transient failures with 1s, 4s, 15s backoff then gives up", async () => {
    const fetchImpl = sequence(
      new Response("oops", { status: 502 }),
      new Response("oops", { status: 503 }),
      new Response("oops", { status: 500 }),
      new Response("oops", { status: 500 }),
    );
    const { client, sleep } = makeClient(fetchImpl);
    await expect(client.fetchPage({ resourceId: RESOURCE })).rejects.toThrow("HTTP 500");
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([1000, 4000, 15000]);
  });

  it("recovers when a retry succeeds", async () => {
    const fetchImpl = sequence(new TypeError("fetch failed"), okPage([{ a: 1 }], 1));
    const { client } = makeClient(fetchImpl);
    const page = await client.fetchPage({ resourceId: RESOURCE });
    expect(page.records).toHaveLength(1);
  });

  it("does not retry a rejected API key", async () => {
    const fetchImpl = sequence(jsonResponse({ error: "Key not authorised" }, 403));
    const { client } = makeClient(fetchImpl);
    await expect(client.fetchPage({ resourceId: RESOURCE })).rejects.toBeInstanceOf(DataGovInAuthError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("waits longer on HTTP 429 and eventually gives up", async () => {
    const limited = () => jsonResponse({ error: "Rate limit exceeded" }, 429);
    const fetchImpl = sequence(limited(), limited(), limited());
    const { client, sleep } = makeClient(fetchImpl, { rateLimitDelaysMs: [60_000, 120_000] });
    await expect(client.fetchPage({ resourceId: RESOURCE })).rejects.toBeInstanceOf(DataGovInRateLimitError);
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([60_000, 120_000]);
  });

  it("treats HTTP 200 + status error 'Meta not found' as a missing resource", async () => {
    const fetchImpl = sequence(jsonResponse({ status: "error", message: "Meta not found", records: [] }));
    const { client } = makeClient(fetchImpl);
    await expect(client.fetchPage({ resourceId: RESOURCE })).rejects.toBeInstanceOf(
      DataGovInResourceNotFoundError,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("maps the Elasticsearch result-window error and does not retry", async () => {
    const fetchImpl = sequence(
      jsonResponse({
        status: "error",
        message: '{"error":{"reason":"Result window is too large, from + size"}}',
      }),
    );
    const { client } = makeClient(fetchImpl);
    await expect(
      client.fetchPage({ resourceId: RESOURCE, offset: 9_000, limit: 1_000 }),
    ).rejects.toBeInstanceOf(DataGovInResultWindowError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("refuses offset + limit beyond 10,000 without calling the API", async () => {
    const fetchImpl = sequence();
    const { client } = makeClient(fetchImpl);
    await expect(
      client.fetchPage({ resourceId: RESOURCE, offset: 9_950, limit: 100 }),
    ).rejects.toBeInstanceOf(DataGovInResultWindowError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("logs a TLS certificate error, retries once, then fails without bypassing TLS", async () => {
    const tlsError = () => new TypeError("fetch failed", { cause: { code: "CERT_HAS_EXPIRED" } });
    const fetchImpl = sequence(tlsError(), tlsError());
    const { client, logger } = makeClient(fetchImpl);
    await expect(client.fetchPage({ resourceId: RESOURCE })).rejects.toBeInstanceOf(DataGovInTlsError);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(
      "data.gov.in TLS certificate error",
      expect.objectContaining({ code: "CERT_HAS_EXPIRED" }),
    );
    expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED).toBeUndefined();
  });

  it("succeeds when the single TLS retry works", async () => {
    const fetchImpl = sequence(
      new TypeError("fetch failed", { cause: { code: "UNABLE_TO_VERIFY_LEAF_SIGNATURE" } }),
      okPage([{ a: 1 }], 1),
    );
    const { client } = makeClient(fetchImpl);
    await expect(client.fetchPage({ resourceId: RESOURCE })).resolves.toMatchObject({ total: 1 });
  });

  it("spaces requests by minRequestIntervalMs", async () => {
    let clock = 0;
    const fetchImpl = sequence(okPage([], 0), okPage([], 0));
    const { client, sleep } = makeClient(fetchImpl, { minRequestIntervalMs: 1_500, now: () => clock });
    await client.fetchPage({ resourceId: RESOURCE });
    clock = 400;
    await client.fetchPage({ resourceId: RESOURCE });
    expect(sleep).toHaveBeenCalledWith(1_100);
  });
});

describe("pagination", () => {
  const rows = Array.from({ length: 25 }, (_, i) => ({ state: "Punjab", n: i }));

  it("pages until total with a delay between pages", async () => {
    const api = createFakeApi(rows);
    const { client, sleep } = makeClient(api.fetch, { pageDelayMs: 300 });
    const seen = [];
    for await (const page of client.paginate({ resourceId: RESOURCE, limit: 10 })) seen.push(...page.records);
    expect(seen).toHaveLength(25);
    expect(api.calls.map((c) => c.offset)).toEqual([0, 10, 20]);
    expect(sleep.mock.calls.filter((c) => c[0] === 300)).toHaveLength(2);
  });

  it("treats an empty records array as the end even before total", async () => {
    const fetchImpl = sequence(okPage([{ a: 1 }, { a: 2 }], 10), okPage([], 10));
    const { client, logger } = makeClient(fetchImpl);
    const pages = [];
    for await (const page of client.paginate({ resourceId: RESOURCE, limit: 2 })) pages.push(page);
    expect(pages).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(
      "empty page before total reached; treating as end",
      expect.objectContaining({ total: 10 }),
    );
  });

  it("pages CSV responses (no total) until an empty page", async () => {
    const header = "State,Market\n";
    const fetchImpl = sequence(
      new Response(header + "Punjab,Khanna\nPunjab,Moga\n", { headers: { "content-type": "text/csv" } }),
      new Response(header, { headers: { "content-type": "text/csv" } }),
    );
    const { client } = makeClient(fetchImpl);
    const records = [];
    for await (const page of client.paginate({ resourceId: RESOURCE, limit: 2 }))
      records.push(...page.records);
    expect(records).toHaveLength(2);
  });

  it("never requests past the result window", async () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ n: i }));
    const api = createFakeApi(many, { maxWindow: 25 });
    const { client } = makeClient(api.fetch, { maxResultWindow: 25 });
    let count = 0;
    for await (const page of client.paginate({ resourceId: RESOURCE, limit: 10 }))
      count += page.records.length;
    expect(count).toBe(25);
    expect(api.calls.at(-1)).toMatchObject({ offset: 20, limit: 5 });
  });
});

describe("verifyFilter", () => {
  const rows = [
    { state: "Uttar Pradesh" },
    { state: "Madhya Pradesh" },
    { state: "Punjab" },
    { state: "Uttar Pradesh" },
  ];

  it("reports exact keyword filters as ok", async () => {
    const { client } = makeClient(createFakeApi(rows).fetch);
    await expect(client.verifyFilter(RESOURCE, "state.keyword", "Uttar Pradesh", 10)).resolves.toEqual({
      status: "ok",
      total: 2,
    });
  });

  it("flags full-text filters that return other values as inexact", async () => {
    const { client } = makeClient(createFakeApi(rows).fetch);
    await expect(client.verifyFilter(RESOURCE, "state", "Uttar Pradesh", 10)).resolves.toMatchObject({
      status: "inexact",
    });
  });

  it("flags wrong-case field names as no-match", async () => {
    const { client } = makeClient(createFakeApi(rows).fetch);
    await expect(client.verifyFilter(RESOURCE, "State.keyword", "Punjab")).resolves.toEqual({
      status: "no-match",
      total: 0,
    });
  });

  it("flags silently ignored filters", async () => {
    const fetchImpl = sequence(okPage([{ arrival_date: "17/09/2026" }], 16142));
    const { client } = makeClient(fetchImpl);
    await expect(client.verifyFilter(RESOURCE, "arrival_date", "16/09/2026")).resolves.toEqual({
      status: "ignored",
      total: 16142,
    });
  });
});
