import { cn } from "@/lib/utils";

/**
 * Decorative artwork, drawn as inline SVG (DESIGN.md).
 *
 * Why not photographs: the pages are read outdoors on phones, where photographic heroes cost
 * payload and contrast; stock images would also need licensing, and an AI-generated "mandi
 * photo" would imply a real place we cannot vouch for. These are a few kilobytes each, need no
 * network request, follow the theme tokens in light and dark mode, and are marked decorative so
 * screen readers skip them.
 */

const DECORATIVE = { "aria-hidden": true as const, focusable: "false" as const };

/**
 * Home hero: the two ends of the trade in one line — sacks and crates in the yard, the
 * auction chalkboard with its prices, and a loaded ship at the port.
 */
export function MandiScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 300" className={cn("h-auto w-full", className)} {...DECORATIVE}>
      {/* ground line */}
      <line x1="0" y1="252" x2="640" y2="252" stroke="var(--border)" strokeWidth="2" />

      {/* sun / horizon disc: a ring, so it reads on a dark ground too */}
      <circle cx="512" cy="92" r="42" fill="none" stroke="var(--highlight)" strokeWidth="3" opacity="0.5" />

      {/* ── chalkboard with the day's rates ── */}
      <g>
        <rect x="24" y="44" width="216" height="150" rx="8" fill="var(--panel)" />
        <rect
          x="34"
          y="54"
          width="196"
          height="130"
          rx="4"
          fill="none"
          stroke="var(--panel-foreground)"
          strokeOpacity="0.25"
        />
        {/* A rate board, drawn rather than written: no font to load, nothing to mistranslate. */}
        <text x="48" y="84" className="fill-[var(--highlight)] text-[20px] font-bold">
          ₹
        </text>
        <rect x="66" y="70" width="86" height="10" rx="3" fill="var(--panel-foreground)" opacity="0.35" />
        {[104, 128, 152].map((y, i) => (
          <g key={y}>
            <rect
              x="48"
              y={y - 9}
              width={70 - i * 8}
              height="7"
              rx="3.5"
              fill="var(--panel-foreground)"
              opacity="0.55"
            />
            <rect
              x={150 + i * 6}
              y={y - 11}
              width={58 - i * 10}
              height="11"
              rx="3"
              fill="var(--highlight)"
              opacity="0.85"
            />
          </g>
        ))}
        <rect x="24" y="194" width="216" height="10" rx="3" fill="var(--panel)" />
      </g>

      {/* ── jute sacks ── */}
      <g>
        <path
          d="M268 252c0-26 12-40 12-56 0-7-4-11-4-17h44c0 6-4 10-4 17 0 16 12 30 12 56Z"
          fill="var(--highlight)"
          opacity="0.9"
        />
        <path
          d="M276 179h44"
          stroke="var(--panel)"
          strokeOpacity="0.5"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M330 252c0-20 9-30 9-42 0-5-3-8-3-13h34c0 5-3 8-3 13 0 12 9 22 9 42Z"
          fill="var(--highlight)"
          opacity="0.6"
        />
      </g>

      {/* ── crate of produce ── */}
      <g>
        <rect
          x="392"
          y="206"
          width="94"
          height="46"
          rx="5"
          fill="var(--muted)"
          stroke="var(--border)"
          strokeWidth="2"
        />
        <path d="M392 222h94" stroke="var(--border)" strokeWidth="2" />
        {[
          [408, 200],
          [430, 196],
          [452, 200],
          [472, 197],
        ].map(([cx, cy]) => (
          <circle key={cx} cx={cx} cy={cy} r="11" fill="var(--rise)" opacity="0.55" />
        ))}
      </g>

      {/* ── hanging balance ── */}
      <g stroke="var(--foreground)" strokeWidth="2.5" fill="none" strokeLinecap="round">
        <path d="M556 96v22" />
        <path d="M524 118h64" />
        <path d="M524 118l-12 26h24Z" fill="var(--muted)" />
        <path d="M588 118l-12 26h24Z" fill="var(--muted)" />
      </g>

      {/* ── ship at the port ── */}
      <g>
        <path d="M498 252h122l-16 26H514Z" fill="var(--muted)" stroke="var(--border)" strokeWidth="2" strokeLinejoin="round" />
        <rect x="524" y="226" width="30" height="26" rx="3" fill="var(--chart-1)" opacity="0.5" />
        <rect x="560" y="214" width="22" height="38" rx="3" fill="var(--rise)" opacity="0.6" />
        <rect x="586" y="232" width="22" height="20" rx="3" fill="var(--highlight)" opacity="0.75" />
      </g>

      {/* ── price line rising across the sky ── */}
      <path
        d="M268 124l38-30 30 22 40-44 34 26 46-58"
        fill="none"
        stroke="var(--rise)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
      <circle cx="456" cy="40" r="5" fill="var(--rise)" />
    </svg>
  );
}
