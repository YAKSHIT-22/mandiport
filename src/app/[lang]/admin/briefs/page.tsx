import Link from "next/link";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { formatDataDate } from "@/lib/dates";
import { publishBrief } from "../actions";

/** Draft review and publishing (SPEC §8.8): only published briefs appear publicly. */
export default async function AdminBriefsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: requested } = await searchParams;
  const status = requested === "published" ? "published" : "draft";
  const rows = await getDb().execute<{
    id: number;
    headline: string;
    body: string;
    week: string;
    crop: string;
    slug: string;
    model: string;
  }>(sql`
    select b.id, b.headline, b.body_md as body, b.week_start::text as week, c.display_name as crop, c.slug, b.model_id as model
    from ai_briefs b join commodities c on c.id = b.commodity_id
    where b.status = ${status} and b.language = 'en'
    order by b.week_start desc, c.markets_reporting_90d desc limit 50`);

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold">Weekly briefs</h1>
      <p>
        Drafts are written from a facts JSON computed in code. Read each one against the figures before
        publishing; only published briefs appear on the site and in sitemaps.
      </p>
      <nav className="flex gap-4">
        <Link href="/admin/briefs?status=draft" className="underline">
          Drafts
        </Link>
        <Link href="/admin/briefs?status=published" className="underline">
          Published
        </Link>
      </nav>
      {rows.rows.length === 0 ? (
        <p>Nothing here.</p>
      ) : (
        <ul className="space-y-6">
          {rows.rows.map((b) => (
            <li key={b.id} className="border-t pt-4">
              <h2 className="text-lg font-semibold">{b.headline}</h2>
              <p className="text-sm">
                {b.crop} · week of {formatDataDate(b.week)} · {b.model} ·{" "}
                <a href={`/crops/${b.slug}`} className="underline">
                  crop page
                </a>
              </p>
              <p className="mt-2 whitespace-pre-line">{b.body}</p>
              <form action={publishBrief} className="mt-3 flex gap-2">
                <input type="hidden" name="briefId" value={b.id} />
                <button
                  name="decision"
                  value={status === "draft" ? "publish" : "unpublish"}
                  className="min-h-11 border px-3 font-semibold"
                >
                  {status === "draft" ? "Publish" : "Move back to draft"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
