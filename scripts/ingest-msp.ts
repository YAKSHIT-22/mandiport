/** Minimum support prices (SPEC §6.2 msp). */
import { getEnv } from "@/env";
import { runMspJob } from "@/lib/ingest/msp-job";
import { createClient, logger, runScript } from "./lib/context";

runScript("ingest-msp", async ({ db }) => {
  const ids = getEnv().DATAGOVIN_RESOURCE_MSP;
  if (ids.length === 0) throw new Error("DATAGOVIN_RESOURCE_MSP is empty");
  const result = await runMspJob({ db, client: createClient(), logger, resourceIds: ids });
  logger.info("msp result", result);
});
