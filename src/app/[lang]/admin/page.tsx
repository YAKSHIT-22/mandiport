import Link from "next/link";
import { getEnv } from "@/env";
import { getAdminOverview, LONG_RUN_MINUTES } from "@/lib/db/admin-queries";
import { getDb } from "@/lib/db";
import { getAdminExtras } from "@/lib/admin/extras";

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export default async function AdminOverviewPage() {
  const env = getEnv();
  const overview = await getAdminOverview(getDb());
  const extras = await getAdminExtras();
  const dbMb = overview.dbBytes / 1024 / 1024;

  return (
    <main className="space-y-8">
      <h1 className="text-2xl font-semibold">Overview</h1>

      <section aria-labelledby="storage" className="space-y-2">
        <h2 id="storage" className="text-lg font-semibold">
          Storage
        </h2>
        <p>
          Database size: <strong>{mb(overview.dbBytes)}</strong>
          {dbMb >= 400 && (
            <span className="ml-2 font-semibold text-red-700">Over 400 MB: Neon Free limit is 500 MB.</span>
          )}
          {dbMb >= env.DB_SIZE_WARN_MB && env.DB_SIZE_WARN_MB !== 400 && (
            <span className="ml-2 font-semibold text-red-700">
              Over the {env.DB_SIZE_WARN_MB} MB warning threshold.
            </span>
          )}
        </p>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Object.entries(overview.counts).map(([k, v]) => (
            <div key={k}>
              <dt className="text-sm">{k.replaceAll("_", " ")}</dt>
              <dd className="font-mono">{v ?? "—"}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="review" className="space-y-2">
        <h2 id="review" className="text-lg font-semibold">
          Needs review
        </h2>
        <ul className="list-disc pl-6">
          <li>
            <Link href="/admin/categories">{overview.pending.categories} unconfirmed categories</Link>
          </li>
          <li>
            <Link href="/admin/mappings">{overview.pending.mappings} suggested export mappings</Link>
          </li>
          <li>
            <Link href="/admin/briefs">{overview.pending.drafts} draft briefs</Link>
          </li>
        </ul>
        <p>Tiers: {[1, 2, 3].map((t) => `Tier ${t}: ${overview.tiers[t] ?? 0}`).join(" · ")}</p>
      </section>

      <section aria-labelledby="services" className="space-y-1">
        <h2 id="services" className="text-lg font-semibold">
          Services
        </h2>
        {extras.map((e) => (
          <p key={e.label}>
            {e.label}: <strong>{e.value}</strong>
          </p>
        ))}
      </section>

      <section aria-labelledby="runs" className="space-y-2">
        <h2 id="runs" className="text-lg font-semibold">
          Ingest runs
        </h2>
        <p>
          Success rate (30 days):{" "}
          {overview.successRates.map((s) => `${s.job} ${s.ok}/${s.total}`).join(" · ") || "no runs yet"}
        </p>
        {overview.longRuns.length > 0 && (
          <p className="font-semibold text-red-700">
            {overview.longRuns.length} run(s) took longer than {LONG_RUN_MINUTES} minutes.
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                {[
                  "#",
                  "Job",
                  "Params",
                  "Status",
                  "Started",
                  "Minutes",
                  "Fetched",
                  "Upserted",
                  "Rejected",
                  "Error",
                ].map((h) => (
                  <th key={h} className="p-1">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {overview.runs.map((r) => (
                <tr key={r.id} className="border-t align-top">
                  <td className="p-1 font-mono">{r.id}</td>
                  <td className="p-1">{r.job}</td>
                  <td className="p-1 font-mono">{JSON.stringify(r.params)}</td>
                  <td className="p-1">{r.interrupted ? "interrupted" : r.status}</td>
                  <td className="p-1 font-mono">{r.started_at.slice(0, 16)}</td>
                  <td className="p-1 font-mono">{r.minutes}</td>
                  <td className="p-1 font-mono">{r.rows_fetched}</td>
                  <td className="p-1 font-mono">{r.rows_upserted}</td>
                  <td className="p-1 font-mono">{r.rows_rejected}</td>
                  <td className="p-1">{r.error}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="rejects" className="space-y-2">
        <h2 id="rejects" className="text-lg font-semibold">
          Rejected rows (7 days)
        </h2>
        {overview.rejects.length === 0 ? (
          <p>No rejected rows.</p>
        ) : (
          <ul className="list-disc pl-6">
            {overview.rejects.map((r) => (
              <li key={r.reason}>
                <span className="font-mono">{r.reason}</span>: {r.count}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
