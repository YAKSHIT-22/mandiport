/** Annual exports by principal commodity and country (SPEC §6.7). --year=2022-23 limits to one year. */
import { getEnv } from "@/env";
import { runExportsJob } from "@/lib/ingest/exports-job";
import { arg, createClient, logger, runScript } from "./lib/context";

runScript("ingest-exports", async ({ db }) => {
  let years = getEnv().DATAGOVIN_RESOURCE_EXPORT_PRINCIPAL;
  if (arg("year")) years = years.filter((y) => y.year === arg("year"));
  if (years.length === 0)
    throw new Error("No export resources configured (DATAGOVIN_RESOURCE_EXPORT_PRINCIPAL)");
  const result = await runExportsJob({ db, client: createClient(), logger, years });
  logger.info("exports result", result);
});
