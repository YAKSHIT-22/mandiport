/**
 * Fetches 10 records from every configured data.gov.in resource and saves the real field
 * list, exposed (filterable) fields, filter checks and a raw sample.
 *
 *   pnpm discover-fields                      # every DATAGOVIN_RESOURCE_* that is set
 *   pnpm discover-fields my-name=<resource-id>  # an extra resource, e.g. a candidate ID
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getEnv, requireEnv } from "@/env";
import { DataGovInClient } from "@/lib/datagovin";
import { logger } from "./lib/log";

const RESOURCE_ENV_KEYS = {
  "mandi-daily": "DATAGOVIN_RESOURCE_MANDI_DAILY",
  "mandi-variety": "DATAGOVIN_RESOURCE_MANDI_VARIETY",
  msp: "DATAGOVIN_RESOURCE_MSP",
  "export-principal": "DATAGOVIN_RESOURCE_EXPORT_PRINCIPAL",
  "export-countrywise": "DATAGOVIN_RESOURCE_EXPORT_COUNTRYWISE",
} as const;

const FIELDS_DIR = path.join("tests", "fixtures", "fields");
const SAMPLES_DIR = path.join("tests", "fixtures", "datagovin");

async function main() {
  const env = getEnv();
  const client = new DataGovInClient({ apiKey: requireEnv("DATAGOVIN_API_KEY"), logger });

  const targets = new Map<string, string>();
  for (const [name, key] of Object.entries(RESOURCE_ENV_KEYS)) {
    const id = env[key];
    if (id) targets.set(name, id);
    else logger.warn("resource ID not set; skipping", { name, envKey: key });
  }
  for (const arg of process.argv.slice(2)) {
    const [name, id] = arg.split("=");
    if (name && id) targets.set(name, id);
  }

  await mkdir(FIELDS_DIR, { recursive: true });
  await mkdir(SAMPLES_DIR, { recursive: true });

  let failures = 0;
  for (const [name, resourceId] of targets) {
    try {
      const page = await client.fetchPage({ resourceId, limit: 10 });
      const exposed = page.meta?.fieldsExposed ?? [];
      const first = page.records[0] ?? {};

      // Test each field's plain and `.keyword` filter using a real value from the sample.
      const filterChecks = [];
      for (const key of Object.keys(first)) {
        const value = first[key];
        if (value === null || value === "" || typeof value === "object") continue;
        for (const filterName of [key, `${key}.keyword`]) {
          const check = await client.verifyFilter(resourceId, filterName, String(value), 50);
          filterChecks.push({ filter: filterName, value: String(value), ...check });
        }
      }

      const summary = {
        name,
        resourceId,
        discoveredAt: new Date().toISOString(),
        responseFormat: page.format,
        title: page.meta?.title ?? null,
        org: page.meta?.org ?? [],
        updatedDate: page.meta?.updatedDate ?? null,
        total: page.total,
        fields: page.meta?.fields ?? [],
        fieldsExposed: exposed,
        recordKeys: Object.keys(first),
        filterChecks,
      };
      await writeFile(path.join(FIELDS_DIR, `${name}.json`), JSON.stringify(summary, null, 2) + "\n");
      await writeFile(
        path.join(SAMPLES_DIR, `${name}-sample.json`),
        JSON.stringify(page.records, null, 2) + "\n",
      );
      logger.info("fields discovered", { name, total: page.total, fields: summary.recordKeys });
    } catch (error) {
      failures++;
      logger.error("discovery failed", {
        name,
        resourceId,
        error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      });
    }
  }
  if (failures > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  logger.error("discover-fields crashed", { error: String(error) });
  process.exit(1);
});
