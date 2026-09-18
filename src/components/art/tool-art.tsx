import { cn } from "@/lib/utils";

/** Small decorative panels for the tools (see mandi-scene.tsx for why these are drawn, not photographed). */

const DECORATIVE = { "aria-hidden": true as const, focusable: "false" as const };
const box = "h-auto w-full";

export type ToolArtName =
  "best-mandi" | "price-history" | "msp-check" | "export-destinations" | "unit-converter" | "ask";

/** Route from a village to two market pins, the nearer one marked. */
function BestMandi({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 110" className={cn(box, className)} {...DECORATIVE}>
      <path
        d="M14 92c34 0 30-44 64-44s34 26 68 26"
        fill="none"
        stroke="var(--border)"
        strokeWidth="3"
        strokeDasharray="7 7"
      />
      <circle cx="14" cy="92" r="7" fill="var(--foreground)" />
      <g fill="var(--rise)">
        <path d="M96 22c10 0 18 8 18 18 0 13-18 30-18 30S78 53 78 40c0-10 8-18 18-18Z" />
      </g>
      <circle cx="96" cy="40" r="6" fill="var(--card)" />
      <g fill="var(--highlight)">
        <path d="M168 44c8 0 15 7 15 15 0 11-15 25-15 25s-15-14-15-25c0-8 7-15 15-15Z" />
      </g>
      <circle cx="168" cy="59" r="5" fill="var(--panel)" />
    </svg>
  );
}

/** A price line over monthly bars: the shape of the trend chart on every crop page. */
function PriceHistory({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 110" className={cn(box, className)} {...DECORATIVE}>
      {[0, 1, 2, 3].map((i) => (
        <line
          key={i}
          x1="10"
          x2="190"
          y1={26 + i * 22}
          y2={26 + i * 22}
          stroke="var(--border)"
          strokeWidth="1.5"
        />
      ))}
      {[30, 62, 94, 126, 158].map((x, i) => (
        <rect
          key={x}
          x={x}
          y={70 - i * 6}
          width="14"
          height={22 + i * 6}
          rx="3"
          fill="var(--rise)"
          opacity="0.28"
        />
      ))}
      <path
        d="M22 78l32-14 32 10 32-26 32 8 32-30"
        fill="none"
        stroke="var(--chart-1)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="182" cy="26" r="5" fill="var(--chart-1)" />
    </svg>
  );
}

/** A market price bar measured against the dashed support-price line. */
function MspCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 110" className={cn(box, className)} {...DECORATIVE}>
      <line
        x1="10"
        y1="52"
        x2="190"
        y2="52"
        stroke="var(--highlight)"
        strokeWidth="3"
        strokeDasharray="10 8"
      />
      <text x="150" y="44" className="fill-[var(--highlight)] text-[13px] font-bold">
        MSP
      </text>
      <rect x="34" y="34" width="26" height="58" rx="4" fill="var(--rise)" opacity="0.7" />
      <rect x="86" y="52" width="26" height="40" rx="4" fill="var(--fall)" opacity="0.6" />
      <rect x="138" y="44" width="26" height="48" rx="4" fill="var(--rise)" opacity="0.45" />
      <line x1="10" y1="92" x2="190" y2="92" stroke="var(--foreground)" strokeWidth="2" />
    </svg>
  );
}

/** A globe with shipping routes running out to three buyers. */
function ExportDestinations({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 110" className={cn(box, className)} {...DECORATIVE}>
      <circle cx="56" cy="56" r="34" fill="var(--rise)" opacity="0.16" />
      <circle cx="56" cy="56" r="34" fill="none" stroke="var(--border)" strokeWidth="2" />
      <path d="M22 56h68" stroke="var(--border)" strokeWidth="1.5" />
      <ellipse cx="56" cy="56" rx="16" ry="34" fill="none" stroke="var(--border)" strokeWidth="1.5" />
      <path d="M22 40h68M22 72h68" stroke="var(--border)" strokeWidth="1.5" opacity="0.6" />
      <circle cx="68" cy="44" r="5" fill="var(--rise)" />
      {[
        [142, 26],
        [172, 56],
        [142, 86],
      ].map(([x, y], i) => (
        <g key={x}>
          <path
            d={`M90 56Q${(90 + x) / 2} ${y < 56 ? y - 14 : y + 14} ${x} ${y}`}
            fill="none"
            stroke="var(--highlight)"
            strokeWidth="2.5"
            strokeDasharray="6 6"
            opacity={0.9 - i * 0.15}
          />
          <circle cx={x} cy={y} r="6" fill="var(--highlight)" />
          <circle cx={x} cy={y} r="2" fill="var(--card)" />
        </g>
      ))}
    </svg>
  );
}

/** Weights on a pan: quintal, kilogram, tonne. */
function UnitConverter({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 110" className={cn(box, className)} {...DECORATIVE}>
      <path d="M100 20v20" stroke="var(--foreground)" strokeWidth="3" strokeLinecap="round" />
      <path d="M48 40h104" stroke="var(--foreground)" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M48 40 32 76h32Z"
        fill="var(--muted)"
        stroke="var(--foreground)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M152 40 136 76h32Z"
        fill="var(--muted)"
        stroke="var(--foreground)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <rect x="86" y="76" width="28" height="18" rx="4" fill="var(--highlight)" opacity="0.8" />
      <rect x="82" y="94" width="36" height="8" rx="3" fill="var(--foreground)" opacity="0.7" />
    </svg>
  );
}

/** A question and an answer built from figures. */
function Ask({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 110" className={cn(box, className)} {...DECORATIVE}>
      <path
        d="M22 20h96a8 8 0 0 1 8 8v34a8 8 0 0 1-8 8H52l-18 16V70h-12a8 8 0 0 1-8-8V28a8 8 0 0 1 8-8Z"
        fill="var(--muted)"
      />
      <rect x="36" y="34" width="60" height="8" rx="4" fill="var(--foreground)" opacity="0.35" />
      <rect x="36" y="50" width="40" height="8" rx="4" fill="var(--foreground)" opacity="0.2" />
      <path
        d="M96 52h74a8 8 0 0 1 8 8v26a8 8 0 0 1-8 8h-56l-14 12V94h-4a8 8 0 0 1-8-8V60a8 8 0 0 1 8-8Z"
        fill="var(--panel)"
      />
      <text x="112" y="80" className="fill-[var(--highlight)] text-[17px] font-bold">
        ₹
      </text>
      <rect x="126" y="68" width="38" height="8" rx="4" fill="var(--panel-foreground)" opacity="0.5" />
      <rect x="126" y="80" width="24" height="7" rx="3.5" fill="var(--panel-foreground)" opacity="0.3" />
    </svg>
  );
}

const ART: Record<ToolArtName, (props: { className?: string }) => React.ReactElement> = {
  "best-mandi": BestMandi,
  "price-history": PriceHistory,
  "msp-check": MspCheck,
  "export-destinations": ExportDestinations,
  "unit-converter": UnitConverter,
  ask: Ask,
};

export function ToolArt({ name, className }: { name: ToolArtName; className?: string }) {
  const Art = ART[name];
  return <Art className={className} />;
}
