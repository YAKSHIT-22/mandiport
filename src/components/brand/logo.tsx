import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Mandiport mark: a filled grain sack beside a rising price line that turns into a ship's
 * bow wave — mandi to port. Pure SVG, legible from favicon size upwards.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={cn("size-8", className)}>
      <rect x="1" y="1" width="38" height="38" rx="9" fill="var(--panel)" />
      <path
        d="M11 20c0-3.6 2-5.4 2-7.6 0-1-.5-1.6-.5-2.4h8c0 .8-.5 1.4-.5 2.4 0 2.2 2 4 2 7.6 0 4.4-2.5 7.4-5.5 7.4S11 24.4 11 20Z"
        fill="var(--highlight)"
      />
      <path d="M12.5 10h8" stroke="var(--panel)" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M22 25.5 26 21l3 2.5L33.5 15.5"
        stroke="var(--panel-foreground)"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M30 15.5h4v4"
        stroke="var(--panel-foreground)"
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 31h24l-3 4H11l-3-4Z" fill="var(--panel-foreground)" fillOpacity="0.85" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex min-h-11 items-center gap-2", className)}>
      <LogoMark />
      <span className="font-heading text-xl font-bold tracking-tight">Mandiport</span>
    </Link>
  );
}
