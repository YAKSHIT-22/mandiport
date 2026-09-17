import Link from "next/link";
import { formatDataDate } from "@/lib/dates";
import { formatNumber, formatRupees } from "@/lib/format";
import type { Headline } from "@/lib/queries/crop";
import { SectionHeading } from "@/components/site/section-heading";
import { cn } from "@/lib/utils";
import { DataDate } from "./meta";
import { ChangeMark, PriceFigure } from "./price";

/** Price panel: the one bold element per page (DESIGN.md), in the reference card style. */
export function PricePanel({
  label,
  headline,
  unitLabel = "/quintal",
  marketsLabel,
  className,
}: {
  label: string;
  headline: Headline;
  unitLabel?: string;
  marketsLabel?: string;
  className?: string;
}) {
  const { latest, weekAgo, monthAgo } = headline;
  return (
    <section
      aria-label={label}
      className={cn(
        "border-panel/20 bg-panel text-panel-foreground rounded-xl border px-5 py-6 sm:px-7",
        className,
      )}
    >
      <p className="font-heading text-highlight text-[0.78rem] font-bold tracking-[0.12em] uppercase">
        {label}
      </p>
      {latest ? (
        <>
          <p className="mt-2">
            <PriceFigure value={latest.value} size="xl" unit={unitLabel} />
          </p>
          <p className="text-panel-foreground/85 mt-2">
            <DataDate date={latest.date} />
            {marketsLabel && <span> · {marketsLabel}</span>}
          </p>
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Price change">
            <li>
              <ChangeMark from={weekAgo?.value} to={latest.value} label="vs 7 days" onDark />
            </li>
            <li>
              <ChangeMark from={monthAgo?.value} to={latest.value} label="vs 30 days" onDark />
            </li>
          </ul>
          {(weekAgo || monthAgo) && (
            <p className="text-panel-foreground/75 mt-3 text-sm">
              Compared with{" "}
              {[
                weekAgo && `${formatRupees(weekAgo.value)} on ${formatDataDate(weekAgo.date)}`,
                monthAgo && `${formatRupees(monthAgo.value)} on ${formatDataDate(monthAgo.date)}`,
              ]
                .filter(Boolean)
                .join(" and ")}
              .
            </p>
          )}
        </>
      ) : (
        <p className="mt-2">No prices reported yet.</p>
      )}
    </section>
  );
}

export function LedgerTable({
  caption,
  children,
  className,
}: {
  caption: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    // Keyboard users must be able to scroll the table sideways, so the container is focusable.
    <div
      role="region"
      aria-label={caption}
      tabIndex={0}
      className={cn("-mx-4 overflow-x-auto px-4 focus-visible:outline-3 sm:mx-0 sm:px-0", className)}
    >
      <table className="w-full min-w-[32rem] border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

export const th = "border-b-2 px-2 py-2 text-sm font-semibold";
export const td = "border-b border-border px-2 py-3 align-top";
export const tdNum = "border-b border-border px-2 py-3 text-right figures font-semibold whitespace-nowrap";

export function Section({
  id,
  title,
  eyebrow,
  action,
  children,
  className,
}: {
  id: string;
  title: string;
  eyebrow?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={cn("border-t pt-8", className)}>
      <SectionHeading id={id} title={title} eyebrow={eyebrow} action={action} />
      {children}
    </section>
  );
}

export function MarketsCount({ n }: { n: number }) {
  return (
    <>
      {formatNumber(n)} {n === 1 ? "market" : "markets"}
    </>
  );
}

export function CropLink({ slug, name }: { slug: string; name: string }) {
  return (
    <Link href={`/crops/${slug}`} className="inline-flex min-h-11 items-center underline">
      {name}
    </Link>
  );
}
