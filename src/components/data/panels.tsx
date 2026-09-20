import Link from "next/link";
import { formatDataDate } from "@/lib/dates";
import { format, getDict, getLocale } from "@/lib/i18n/dictionary";
import { formatNumber, formatRupees } from "@/lib/format";
import type { Headline } from "@/lib/queries/crop";
import { SectionHeading } from "@/components/site/section-heading";
import { cn } from "@/lib/utils";
import { DataDate } from "./meta";
import { ChangeMark, PriceFigure } from "./price";

/** Price panel: the one bold element per page (DESIGN.md), in the reference card style. */
export async function PricePanel({
  label,
  headline,
  unitLabel,
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
  const t = await getDict();
  const locale = await getLocale();
  const unit = unitLabel ?? t.panel.unit;
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
            <PriceFigure value={latest.value} size="xl" unit={unit} />
          </p>
          <p className="text-panel-foreground/85 mt-2">
            <DataDate date={latest.date} />
            {marketsLabel && <span> · {marketsLabel}</span>}
          </p>
          <ul className="mt-4 flex flex-wrap gap-2" aria-label={t.panel.priceChange}>
            <li>
              <ChangeMark from={weekAgo?.value} to={latest.value} label={t.panel.vs7} onDark />
            </li>
            <li>
              <ChangeMark from={monthAgo?.value} to={latest.value} label={t.panel.vs30} onDark />
            </li>
          </ul>
          {(weekAgo || monthAgo) && (
            <p className="text-panel-foreground/75 mt-3 text-sm">
              {t.panel.comparedWith}{" "}
              {[
                weekAgo &&
                  format(t.panel.onDate, {
                    price: formatRupees(weekAgo.value),
                    date: formatDataDate(weekAgo.date, locale),
                  }),
                monthAgo &&
                  format(t.panel.onDate, {
                    price: formatRupees(monthAgo.value),
                    date: formatDataDate(monthAgo.date, locale),
                  }),
              ]
                .filter(Boolean)
                .join(` ${t.panel.and} `)}
              .
            </p>
          )}
        </>
      ) : (
        <p className="mt-2">{t.panel.noPrices}</p>
      )}
    </section>
  );
}

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

export { LedgerTable, td, tdNum, th } from "./table";
