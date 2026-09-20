import Link from "next/link";
import { describeDataDate, formatDataDate } from "@/lib/dates";
import { format, getDict, getLocale } from "@/lib/i18n/dictionary";
import { DATASETS, GODL_LICENCE_NAME, GODL_LICENCE_URL, type DatasetKey } from "@/lib/sources";
import { cn } from "@/lib/utils";
import { SourceLink } from "./source-link";

/** "Data from 16 Sep 2026" or "Data from today" — never "today" unless it is (SPEC §6.1). */
export async function DataDate({ date, className }: { date: string | null | undefined; className?: string }) {
  const t = await getDict();
  const locale = await getLocale();
  if (!date) return <span className={cn("text-muted-foreground text-sm", className)}>{t.common.noData}</span>;
  const [before, after] = t.common.dataFrom.split("{date}");
  return (
    <span className={cn("text-sm", className)}>
      {before}
      <time dateTime={date}>{describeDataDate(date, new Date(), locale)}</time>
      {after}
    </span>
  );
}

export async function PlainDate({ date }: { date: string }) {
  return <time dateTime={date}>{formatDataDate(date, await getLocale())}</time>;
}

/** Attribution block required on every page with data (SPEC §11). */
export async function SourceNote({ datasets, className }: { datasets: DatasetKey[]; className?: string }) {
  const unique = [...new Set(datasets)].map((k) => DATASETS[k]);
  const t = await getDict();
  return (
    <aside
      aria-label={t.common.dataSources}
      className={cn("border-border text-muted-foreground border-t pt-4 text-sm", className)}
    >
      {unique.map((d) => (
        <p key={d.key} className="mt-1">
          {format(t.common.sourceLine, { agency: d.agency })} “
          <SourceLink href={d.pageUrl} dataset={d.key}>
            {d.title}
          </SourceLink>
          ”. {t.common.licensedUnder}{" "}
          <a href={GODL_LICENCE_URL} className="underline" rel="license noopener" target="_blank">
            {GODL_LICENCE_NAME}
          </a>
          .
        </p>
      ))}
      <p className="mt-2">
        {t.common.pricesCaveat}{" "}
        <Link href="/methodology" className="underline">
          {t.common.howWeCollect}
        </Link>
        .
      </p>
    </aside>
  );
}

export { EmptyState, ErrorState } from "./states";
