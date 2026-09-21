import Link from "next/link";
import { SearchBox } from "@/components/site/search-box";
import { getDict, getLocale } from "@/lib/i18n/dictionary";

export default async function NotFound() {
  const t = await getDict();
  const locale = await getLocale();
  return (
    <main className="container-mp space-y-4 py-10">
      <h1>{t.notFound.title}</h1>
      <p>{t.notFound.body}</p>
      <div className="max-w-xl">
        <SearchBox
          labels={{
            placeholder: t.chrome.searchPlaceholder,
            label: t.search.label,
            search: t.chrome.search,
            results: t.search.results,
            notResponding: t.search.notResponding,
            noMatches: t.search.noMatches,
          }}
          locale={locale}
        />
      </div>
      <p>
        <Link href="/crops" className="underline">
          {t.notFound.browse}
        </Link>
      </p>
    </main>
  );
}
