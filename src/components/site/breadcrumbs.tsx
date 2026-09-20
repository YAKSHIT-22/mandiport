import Link from "next/link";
import { getDict } from "@/lib/i18n/dictionary";
import { breadcrumbJsonLd, type Crumb } from "@/lib/seo/jsonld";
import { JsonLd } from "./json-ld";

export async function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  const t = await getDict();
  return (
    <>
      <nav aria-label={t.chrome.breadcrumb} className="text-sm">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {crumbs.map((c, i) => (
            <li key={c.path} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden="true">›</span>}
              {i === crumbs.length - 1 ? (
                <span aria-current="page">{c.name}</span>
              ) : (
                <Link href={c.path} className="inline-flex min-h-11 items-center underline">
                  {c.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
    </>
  );
}
