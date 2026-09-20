import { computeChange, formatPercent, formatRupees } from "@/lib/format";
import { format, getDict } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/utils";

export function PriceFigure({
  value,
  unit = "/quintal",
  size = "lg",
  className,
}: {
  value: number | null | undefined;
  unit?: string | null;
  size?: "xl" | "lg" | "md";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "figures font-bold",
        size === "xl" && "text-price-xl",
        size === "lg" && "text-price-lg",
        className,
      )}
    >
      {formatRupees(value)}
      {unit && value !== null && value !== undefined && (
        <span className="ml-1 align-baseline text-base font-medium">{unit}</span>
      )}
    </span>
  );
}

/** ▲/▼ change with words, never colour alone (DESIGN.md). */
export async function ChangeMark({
  from,
  to,
  label,
  onDark = false,
  className,
}: {
  from: number | null | undefined;
  to: number | null | undefined;
  label: string;
  onDark?: boolean;
  className?: string;
}) {
  const t = await getDict();
  const change = computeChange(from, to);
  if (!change) {
    return (
      <span
        className={cn("text-sm", onDark ? "text-panel-foreground/80" : "text-muted-foreground", className)}
      >
        {format(t.panel.noComparison, { label })}
      </span>
    );
  }
  const symbol = change.direction === "up" ? "▲" : change.direction === "down" ? "▼" : "–";
  const words =
    change.direction === "flat"
      ? t.panel.noChange
      : `${formatRupees(Math.abs(change.absolute))} (${formatPercent(change.percent)})`;
  const tone = onDark
    ? change.direction === "up"
      ? "bg-panel-foreground/10 text-rise-panel ring-1 ring-panel-foreground/25"
      : change.direction === "down"
        ? "bg-panel-foreground/10 text-fall-panel ring-1 ring-panel-foreground/25"
        : "bg-panel-foreground/10 text-panel-foreground ring-1 ring-panel-foreground/25"
    : change.direction === "up"
      ? "text-rise"
      : change.direction === "down"
        ? "text-fall"
        : "text-muted-foreground";
  const srDirection =
    change.direction === "up"
      ? t.common.up
      : change.direction === "down"
        ? t.common.down
        : t.common.unchanged;
  return (
    <span
      className={cn(
        "figures inline-flex items-center gap-1 rounded-full font-semibold",
        onDark && "px-3 py-1",
        tone,
        className,
      )}
    >
      <span aria-hidden="true">{symbol}</span>
      <span className="sr-only">{srDirection}</span>
      {words} <span className="font-medium">{label}</span>
    </span>
  );
}
