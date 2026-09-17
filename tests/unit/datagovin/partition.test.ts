import { describe, expect, it } from "vitest";
import { DataGovInClient, fetchPartition, planPartitions } from "@/lib/datagovin";
import { createFakeApi, noSleep } from "../../helpers/fake-datagovin";

const RESOURCE = "9ef84268-d588-465a-a308-a864a43d0070";

function rowsFor(state: string, district: string, market: string, n: number) {
  return Array.from({ length: n }, (_, i) => ({ state, district, market, commodity: `C${i}` }));
}

// Window of 20 rows stands in for the real 10,000.
const WINDOW = 20;
const rows = [
  ...rowsFor("Punjab", "Ludhiana", "Khanna", 8),
  ...rowsFor("Uttar Pradesh", "Agra", "Agra APMC", 15),
  ...rowsFor("Uttar Pradesh", "Kanpur", "Kanpur APMC ", 10), // trailing space as in real data
  ...rowsFor("Madhya Pradesh", "Indore", "Indore", 6),
];

function setup() {
  const api = createFakeApi(rows, { maxWindow: WINDOW });
  const client = new DataGovInClient({
    apiKey: "k",
    fetch: api.fetch,
    sleep: noSleep,
    maxResultWindow: WINDOW,
  });
  return { api, client };
}

describe("planPartitions", () => {
  it("splits oversize states by district and covers every row", async () => {
    const { client } = setup();
    const plan = await planPartitions(client, {
      resourceId: RESOURCE,
      dimensions: ["state", "district", "market"],
      seedValues: ["Punjab", "Uttar Pradesh", "Madhya Pradesh"],
    });
    expect(plan.expectedTotal).toBe(39);
    expect(plan.plannedTotal).toBe(39);
    expect(plan.gaps).toEqual([]);
    expect(plan.partitions.map((p) => p.filters)).toEqual([
      { "state.keyword": "Punjab" },
      { "state.keyword": "Uttar Pradesh", "district.keyword": "Agra" },
      { "state.keyword": "Uttar Pradesh", "district.keyword": "Kanpur" },
      { "state.keyword": "Madhya Pradesh" },
    ]);
  });

  it("discovers states missing from the seeds, including rows beyond the result window", async () => {
    const { client } = setup();
    // Madhya Pradesh rows sit after row 20, so an unfiltered scan cannot see them.
    const plan = await planPartitions(client, {
      resourceId: RESOURCE,
      dimensions: ["state", "district"],
      seedValues: ["Punjab"],
      discoveryFields: ["commodity"],
    });
    expect(plan.discoveredValues.sort()).toEqual(["Madhya Pradesh", "Uttar Pradesh"]);
    expect(plan.plannedTotal).toBe(39);
    expect(plan.gaps).toEqual([]);
  });

  it("reports a gap instead of silently missing unreachable rows", async () => {
    const { client } = setup();
    const plan = await planPartitions(client, {
      resourceId: RESOURCE,
      dimensions: ["state", "district"],
    });
    expect(plan.plannedTotal).toBe(33);
    expect(plan.gaps).toContainEqual({ filters: {}, missing: 6 });
  });

  it("uses exact keyword filters so 'Uttar Pradesh' excludes 'Madhya Pradesh'", async () => {
    const { client } = setup();
    const plan = await planPartitions(client, {
      resourceId: RESOURCE,
      dimensions: ["state", "district"],
      seedValues: ["Uttar Pradesh", "Madhya Pradesh", "Punjab"],
    });
    const mp = plan.partitions.find((p) => p.filters["state.keyword"] === "Madhya Pradesh");
    expect(mp?.total).toBe(6);
  });

  it("reports a gap when the finest dimension is still too large", async () => {
    const big = rowsFor("Kerala", "Ernakulam", "Aluva", 30);
    const api = createFakeApi(big, { maxWindow: WINDOW });
    const client = new DataGovInClient({
      apiKey: "k",
      fetch: api.fetch,
      sleep: noSleep,
      maxResultWindow: WINDOW,
    });
    const plan = await planPartitions(client, {
      resourceId: RESOURCE,
      dimensions: ["state", "district"],
      seedValues: ["Kerala"],
    });
    expect(plan.gaps).toContainEqual({
      filters: { "state.keyword": "Kerala", "district.keyword": "Ernakulam" },
      missing: 10,
    });
  });

  it("partitions can be fetched completely, keeping raw values like trailing spaces", async () => {
    const { client } = setup();
    const plan = await planPartitions(client, {
      resourceId: RESOURCE,
      dimensions: ["state", "district", "market"],
      discoveryFields: ["commodity"],
    });
    const fetched = [];
    for (const partition of plan.partitions) {
      const result = await fetchPartition(client, RESOURCE, partition);
      expect(result.complete).toBe(true);
      fetched.push(...result.records);
    }
    expect(fetched).toHaveLength(rows.length);
    expect(fetched.filter((r) => r.market === "Kanpur APMC ")).toHaveLength(10);
  });
});

describe("unstable result order", () => {
  // The real API returns rows in a different order on each request.
  const many = Array.from({ length: 12 }, (_, i) => ({ state: "Keralam", n: i }));

  it("makes multi-page reads repeat and skip rows", async () => {
    const api = createFakeApi(many, { maxWindow: WINDOW, unstableOrder: true });
    const client = new DataGovInClient({
      apiKey: "k",
      fetch: api.fetch,
      sleep: noSleep,
      maxResultWindow: WINDOW,
    });
    const paged = [];
    for await (const page of client.paginate({ resourceId: RESOURCE, limit: 5 })) paged.push(...page.records);
    expect(paged).toHaveLength(12);
    expect(new Set(paged.map((r) => r.n)).size).toBeLessThan(12);
  });

  it("fetchPartition reads the whole partition in one request, so nothing is lost", async () => {
    const api = createFakeApi(many, { maxWindow: WINDOW, unstableOrder: true });
    const client = new DataGovInClient({
      apiKey: "k",
      fetch: api.fetch,
      sleep: noSleep,
      maxResultWindow: WINDOW,
    });
    const result = await fetchPartition(client, RESOURCE, {
      filters: { "state.keyword": "Keralam" },
      total: 12,
    });
    expect(new Set(result.records.map((r) => r.n)).size).toBe(12);
    expect(result.complete).toBe(true);
    expect(api.calls.at(-1)).toMatchObject({ offset: 0, limit: WINDOW });
  });

  it("marks a partition incomplete when it has outgrown the window", async () => {
    const grown = Array.from({ length: 25 }, (_, i) => ({ state: "Keralam", n: i }));
    const api = createFakeApi(grown, { maxWindow: WINDOW });
    const client = new DataGovInClient({
      apiKey: "k",
      fetch: api.fetch,
      sleep: noSleep,
      maxResultWindow: WINDOW,
    });
    const result = await fetchPartition(client, RESOURCE, {
      filters: { "state.keyword": "Keralam" },
      total: 18,
    });
    expect(result).toMatchObject({ total: 25, complete: false });
    expect(result.records).toHaveLength(WINDOW);
  });
});
