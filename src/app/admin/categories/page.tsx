import { getDb } from "@/lib/db";
import { getCategoryReviewQueue } from "@/lib/db/admin-queries";
import { confirmCategory } from "../actions";

export default async function AdminCategoriesPage() {
  const { commodities, categories } = await getCategoryReviewQueue(getDb());

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold">Confirm categories</h1>
      <p>
        Suggested by keyword rules. Unconfirmed commodities appear under “Others” on public pages until
        confirmed. Sorted by tier, then markets reporting.
      </p>
      {commodities.length === 0 ? (
        <p>All categories are confirmed.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="p-1">Commodity</th>
                <th className="p-1">Tier</th>
                <th className="p-1">Markets (90d)</th>
                <th className="p-1">Category</th>
              </tr>
            </thead>
            <tbody>
              {commodities.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="p-1">
                    {c.display_name}
                    {c.display_name !== c.source_name && (
                      <span className="block font-mono text-xs">{c.source_name}</span>
                    )}
                  </td>
                  <td className="p-1">{c.tier}</td>
                  <td className="p-1 font-mono">{c.markets}</td>
                  <td className="p-1">
                    <form action={confirmCategory} className="flex flex-wrap gap-2">
                      <input type="hidden" name="commodityId" value={c.id} />
                      <label className="sr-only" htmlFor={`cat-${c.id}`}>
                        Category for {c.display_name}
                      </label>
                      <select
                        id={`cat-${c.id}`}
                        name="categoryId"
                        defaultValue={c.category_id ?? ""}
                        required
                        className="border p-2"
                      >
                        <option value="" disabled>
                          Choose…
                        </option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="min-h-11 border px-3">
                        Confirm
                      </button>
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
