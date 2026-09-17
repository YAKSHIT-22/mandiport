import Link from "next/link";
import { describeDataDate, formatDataDate } from "@/lib/dates";
import { DATASETS, GODL_LICENCE_NAME, GODL_LICENCE_URL, type DatasetKey } from "@/lib/sources";
import { cn } from "@/lib/utils";
import { SourceLink } from "./source-link";

/** "Data from 16 Sep 2026" or "Data from today" — never "today" unless it is (SPEC §6.1). */
export function DataDate({
  date,
  prefix = "Data from",
  className,
}: {
  date: string | null | undefined;
  prefix?: string;
  className?: string;
}) {
  if (!date) return <span className={cn("text-muted-foreground text-sm", className)}>No data yet</span>;
  return (
    <span className={cn("text-sm", className)}>
      {prefix} <time dateTime={date}>{describeDataDate(date)}</time>
    </span>
  );
}

export function PlainDate({ date }: { date: string }) {
  return <time dateTime={date}>{formatDataDate(date)}</time>;
}

/** Attribution block required on every page with data (SPEC §11). */
export function SourceNote({ datasets, className }: { datasets: DatasetKey[]; className?: string }) {
  const unique = [...new Set(datasets)].map((k) => DATASETS[k]);
  return (
    <aside
      aria-label="Data sources"
      className={cn("border-border text-muted-foreground border-t pt-4 text-sm", className)}
    >
      {unique.map((d) => (
        <p key={d.key} className="mt-1">
          Source: {d.agency} via Open Government Data Platform India (data.gov.in), dataset “
          <SourceLink href={d.pageUrl} dataset={d.key}>
            {d.title}
          </SourceLink>
          ”. Licensed under{" "}
          <a href={GODL_LICENCE_URL} className="underline" rel="license noopener" target="_blank">
            {GODL_LICENCE_NAME}
          </a>
          .
        </p>
      ))}
      <p className="mt-2">
        Prices are as published and may be delayed, incomplete or revised. Not trading advice.{" "}
        <Link href="/methodology" className="underline">
          How we collect and calculate
        </Link>
        .
      </p>
    </aside>
  );
}

export function EmptyState({
  title,
  children,
  className,
}: {
  title: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div role="status" className={cn("border-border bg-muted border-l-4 px-4 py-3", className)}>
      <p className="font-semibold">{title}</p>
      {children && <div className="text-muted-foreground mt-1">{children}</div>}
    </div>
  );
}

export function ErrorState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div role="alert" className="border-destructive bg-muted border-l-4 px-4 py-3">
      <p className="text-fall font-semibold">{title}</p>
      {children && <div className="mt-1">{children}</div>}
    </div>
  );
}
