/** Weekly/monthly rollups + retention (SPEC §6.3). --from=YYYY-MM-DD --to=YYYY-MM-DD, default last 45 days. */
import { todayInIst } from "@/lib/dates";
import { applyRetention, buildRollups, daysBefore } from "@/lib/ingest/rollups";
import { arg, flag, logger, runScript } from "./lib/context";

runScript("build-rollups", async ({ db }) => {
  const today = todayInIst();
  const from = arg("from") ?? daysBefore(today, 45);
  const to = arg("to") ?? today;
  const rollups = await buildRollups(db, from, to);
  logger.info("rollups built", { from, to, ...rollups });
  if (!flag("skip-retention")) logger.info("retention applied", { ...(await applyRetention(db, today)) });
});
