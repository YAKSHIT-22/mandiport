import { cn } from "@/lib/utils";

/** One glyph per crop category, on a 48-unit square grid (see mandi-scene.tsx for why these are drawn). */

const DECORATIVE = { "aria-hidden": true as const, focusable: "false" as const };

const PATHS: Record<string, React.ReactNode> = {
  // onion bulb with shoots
  vegetables: (
    <>
      <path d="M24 16c9 0 15 8 15 16s-7 12-15 12-15-4-15-12 6-16 15-16Z" fill="var(--rise)" opacity="0.55" />
      <path
        d="M24 16c0-5-4-8-8-9M24 16c1-5 5-8 9-9"
        stroke="var(--rise)"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M24 18v26" stroke="var(--card)" strokeWidth="2" opacity="0.7" />
    </>
  ),
  // apple with leaf
  fruits: (
    <>
      <path d="M24 16c6-4 16-2 16 10s-9 18-16 18S8 38 8 26s10-14 16-10Z" fill="var(--fall)" opacity="0.5" />
      <path d="M24 16V8" stroke="var(--foreground)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 12c4-6 10-6 12-5-1 5-6 7-12 5Z" fill="var(--rise)" opacity="0.7" />
    </>
  ),
  // wheat ear
  cereals: (
    <>
      <path d="M24 44V14" stroke="var(--foreground)" strokeWidth="2.5" strokeLinecap="round" />
      {[14, 22, 30].map((y) => (
        <g key={y} fill="var(--highlight)" opacity="0.8">
          <path d={`M24 ${y}c-9 0-13 5-13 9 7 0 13-3 13-9Z`} />
          <path d={`M24 ${y}c9 0 13 5 13 9-7 0-13-3-13-9Z`} />
        </g>
      ))}
    </>
  ),
  // pods with seeds
  pulses: (
    <>
      <path d="M10 34c0-14 8-22 22-24-2 16-9 24-22 24Z" fill="var(--rise)" opacity="0.4" />
      {[
        [17, 31],
        [23, 25],
        [29, 18],
      ].map(([cx, cy]) => (
        <circle key={cx} cx={cx} cy={cy} r="3.5" fill="var(--rise)" />
      ))}
      <path
        d="M12 42c10 0 22-2 28-8"
        stroke="var(--foreground)"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
    </>
  ),
  // chilli
  spices: (
    <>
      <path d="M32 10c-2 6 4 8 4 16 0 12-10 18-20 18 0-14 4-22 10-26" fill="var(--fall)" opacity="0.55" />
      <path d="M32 10c3-3 7-3 9-2-1 4-4 6-9 2Z" fill="var(--rise)" opacity="0.8" />
    </>
  ),
  // mustard seeds and oil drop
  oilseeds: (
    <>
      <path
        d="M24 10c7 10 11 15 11 21a11 11 0 1 1-22 0c0-6 4-11 11-21Z"
        fill="var(--highlight)"
        opacity="0.7"
      />
      <circle cx="20" cy="32" r="3" fill="var(--card)" opacity="0.8" />
    </>
  ),
  // cotton boll
  fibres: (
    <>
      <circle cx="18" cy="20" r="8" fill="var(--muted)" />
      <circle cx="30" cy="18" r="7" fill="var(--muted)" />
      <circle cx="24" cy="27" r="9" fill="var(--muted)" />
      <path d="M24 34v10" stroke="var(--foreground)" strokeWidth="2.5" strokeLinecap="round" />
      {[
        [16, 30],
        [32, 29],
      ].map(([x, y]) => (
        <path
          key={x}
          d={`M24 38 ${x} ${y}`}
          stroke="var(--foreground)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ))}
    </>
  ),
  // marigold
  flowers: (
    <>
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <ellipse
          key={a}
          cx="24"
          cy="12"
          rx="6"
          ry="9"
          fill="var(--highlight)"
          opacity="0.7"
          transform={`rotate(${a} 24 22)`}
        />
      ))}
      <circle cx="24" cy="22" r="5" fill="var(--fall)" opacity="0.8" />
      <path d="M24 28v16" stroke="var(--rise)" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  // almond and cashew
  "dry-fruits": (
    <>
      <path d="M18 8c8 6 10 16 6 26-3 8-11 10-13 2-3-11 0-22 7-28Z" fill="var(--highlight)" opacity="0.65" />
      <path d="M40 18c-10 0-16 8-16 16 0 6 5 8 9 5 7-5 9-14 7-21Z" fill="var(--rise)" opacity="0.45" />
    </>
  ),
  // hen
  "livestock-poultry": (
    <>
      <path d="M14 40c-2-12 4-20 13-20 8 0 13 6 13 14 0 4-2 6-6 6Z" fill="var(--highlight)" opacity="0.7" />
      <circle cx="31" cy="16" r="6" fill="var(--highlight)" opacity="0.9" />
      <path d="M31 8c-2-4 1-5 3-4 1 3-1 4-3 4Z" fill="var(--fall)" />
      <path d="M37 17l5 2-5 2Z" fill="var(--fall)" />
      <path d="M20 40v4M28 40v4" stroke="var(--foreground)" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  // a full crate: whatever else the mandi sells
  others: (
    <>
      <rect
        x="8"
        y="22"
        width="32"
        height="20"
        rx="3"
        fill="var(--muted)"
        stroke="var(--border)"
        strokeWidth="2"
      />
      <path d="M8 30h32" stroke="var(--border)" strokeWidth="2" />
      {[
        [15, 18],
        [24, 15],
        [33, 18],
      ].map(([cx, cy]) => (
        <circle key={cx} cx={cx} cy={cy} r="5" fill="var(--rise)" opacity="0.5" />
      ))}
    </>
  ),
};

export function CategoryArt({ slug, className }: { slug: string; className?: string }) {
  const art = PATHS[slug] ?? PATHS.others;
  return (
    <svg viewBox="0 0 48 48" className={cn("size-12", className)} {...DECORATIVE}>
      {art}
    </svg>
  );
}
