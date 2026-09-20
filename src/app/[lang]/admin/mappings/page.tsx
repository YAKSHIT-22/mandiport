import Link from "next/link";
import { getDb } from "@/lib/db";
import { getMappingReviewQueue } from "@/lib/db/admin-queries";
import { reviewMapping } from "../actions";

const statuses = ["suggested", "verified", "rejected"] as const;

export default async function AdminMappingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: requested } = await searchParams;
  const status = statuses.find((s) => s === requested) ?? "suggested";
  const rows = await getMappingReviewQueue(getDb(), status);

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold">Export mappings</h1>
      <p>
        Export data is published for broad principal commodities (for example “Fresh vegetables”), so many
        crops can only map to a group. Enter HS codes yourself; they are never filled automatically. Pages
        show export data only for verified or suggested mappings, with an “Unverified mapping” note until
        verified.
      </p>
      <nav aria-label="Status" className="flex gap-4">
        {statuses.map((s) => (
          <Link
            key={s}
            href={`/admin/mappings?status=${s}`}
            aria-current={s === status ? "page" : undefined}
            className="underline"
          >
            {s}
          </Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <p>Nothing here.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="p-1">Commodity</th>
                <th className="p-1">Tier</th>
                <th className="p-1">Export commodity</th>
                <th className="p-1">Confidence</th>
                <th className="p-1">Review</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-t align-top">
                  <td className="p-1">{m.commodity}</td>
                  <td className="p-1">{m.tier}</td>
                  <td className="p-1">
                    {m.export_commodity}
                    <span className="block text-xs">{m.notes}</span>
                  </td>
                  <td className="p-1 font-mono">{m.confidence}</td>
                  <td className="p-1">
                    <form action={reviewMapping} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="mappingId" value={m.id} />
                      <label className="flex flex-col text-xs">
                        HS code
                        <input
                          name="hsCode"
                          defaultValue={m.hs_code ?? ""}
                          inputMode="numeric"
                          className="w-28 border p-2 font-mono"
                        />
                      </label>
                      <button name="decision" value="verify" className="min-h-11 border px-3">
                        Verify
                      </button>
                      <button name="decision" value="reject" className="min-h-11 border px-3">
                        Reject
                      </button>
                      {status !== "suggested" && (
                        <button name="decision" value="reset" className="min-h-11 border px-3">
                          Back to queue
                        </button>
                      )}
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
