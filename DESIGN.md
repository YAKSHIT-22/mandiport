# Mandiport design

Mandiport is read on a phone in a market yard at noon, by someone deciding where to take a truck of onions tomorrow. The design is built for that moment: the figure has to be readable in direct sunlight at arm's length, with its date beside it, before anything else on the screen.

The subject world is the mandi **trade ledger** (ruled paper, columns of figures, rubber-stamped dates) and the **auction chalkboard** (dark green board, figures written large). Nothing here is generic SaaS: no card grids with soft shadows, no gradient washes, no eyebrow labels.

**References (the human asked twice to follow these):** `~/Desktop/handyads` and `~/Desktop/horrorlog` (NightLore). Adopted from them:

- shadcn "new-york" structure: Radix primitives, `cva` variants, `cn()`, `data-slot` attributes, lucide icons, CSS-variable tokens (`background`, `foreground`, `card`, `primary`, `muted`, `border`, `ring`).
- Sticky, blurred site header with logo, active-state nav links and a Sheet mobile menu; footer with logo, tagline and link columns (NightLore).
- `SectionHeading` with an optional eyebrow and a right-hand action, and bordered `panel`/`Card` surfaces (NightLore).
- Space Grotesk headings + Inter body, 10 px radius, 1216 px container (NightLore).
- A light theme (default) and a dark theme built from NightLore's ink palette, with a toggle that remembers the choice.

This overrides SPEC §13's "avoid card grids and eyebrow labels": the human's instruction wins, and eyebrows are used sparingly (section headers only). The accessibility minimums stay: every token pair passes WCAG AA, tap targets are ≥ 44 px, and the focus ring is a 3 px `ring` outline.

## Principles

1. **Figures first.** On every page the most legible thing is the price, in large tabular figures. Labels are smaller and quieter than the numbers they describe.
2. **Always say when and from where.** A price never appears without its arrival date and source. "Today" only when the data is from today in IST.
3. **Quiet frame, one loud element.** All boldness goes into price figures and their change marks. Everything else (navigation, headings, tables, forms) is plain ink on paper.

## Colour tokens

Light is the default, because the site is read outdoors in bright light. A dark theme (NightLore's ink palette) is available from the header toggle and remembered per device. Colours are CSS variables, so both themes share one set of component classes.

| Token      | Hex       | Role                                                              | Contrast                                                   |
| ---------- | --------- | ----------------------------------------------------------------- | ---------------------------------------------------------- |
| `ink`      | `#15191B` | Body text, figures, rules on emphasis                             | 16.1:1 on paper                                            |
| `paper`    | `#F8F4EA` | Page background (ledger paper)                                    | —                                                          |
| `chalk`    | `#1E3A2F` | Header, price panel, primary buttons (auction board)              | 11.2:1 with paper text                                     |
| `turmeric` | `#E3A21A` | Focus ring, active tab underline, highlights. Never text on paper | 5.6:1 on chalk (2.0:1 on paper: never used for text there) |
| `rise`     | `#0E5A99` | Price up (▲). Blue, not green, for colour-blind safety            | 6.5:1 on paper                                             |
| `fall`     | `#B02A1E` | Price down (▼) (sindoor red)                                      | 6.0:1 on paper                                             |

Supporting shades (derived, not new hues):

- `ink-muted` `#4A5157` for secondary text (7.3:1 on paper).
- `rule` `#D8CFBC` for ledger lines.
- `paper-deep` `#EFE8D8` for table stripes and input fills.
- `chalk-text` `#F8F4EA` (paper on chalk).

Change marks always pair colour with a symbol and words ("▲ ₹120 (4.2%) vs 7 days ago"), so meaning never depends on colour alone.

Chart series use `ink` (modal price line), a `rise`-tinted band (min–max range) and a dashed `turmeric` line on a chalk label for MSP. These are colour-blind safe because they differ in shape as well as hue.

## Type

- **Space Grotesk** (600/700): page and section headings, in sentence case. From both reference projects.
- **Inter** (400/500/700): body, tables, forms, and **all figures**, with `font-variant-numeric: tabular-nums lining-nums`. Inter's tabular figures keep columns of prices aligned.
- **Noto Sans Devanagari** (400/600): loaded for Hindi pages when i18n arrives. Its metrics pair with Inter.
- All three are self-hosted with `next/font`, subset, and `display: swap`.

| Step       | Size / line height                        | Use                                                         |
| ---------- | ----------------------------------------- | ----------------------------------------------------------- |
| `price-xl` | 48/52 px (clamp 40–56), Inter 700 tabular | Headline price on hub pages                                 |
| `price-lg` | 30/36 px, Inter 700 tabular               | Tool results, market headline                               |
| `h1`       | 30/36 px, Space Grotesk 700               | Page title                                                  |
| `h2`       | 22/28 px, Space Grotesk 600               | Section                                                     |
| `h3`       | 18/24 px, Space Grotesk 600               | Sub-section                                                 |
| `body`     | 17/27 px, Inter 400                       | Body copy (slightly larger than usual, for outdoor reading) |
| `small`    | 14/20 px, Inter 500                       | Dates, source lines, table meta                             |

Numbers use Indian digit grouping (`₹1,25,000`), and units are always shown (`₹/quintal`). Dates read `17 Sep 2026`.

## Spacing, shape, layout

- **Spacing:** 4 px base. The scale is 4, 8, 12, 16, 24, 32, 48, 64.
- **Radius:** 4 px on buttons, inputs and panels. Pills (change marks) are 999 px.
- **Tap targets:** at least 44 × 44 px. Inputs are 48 px tall.
- **Rules and bordered cards, not heavy shadows.** Sections are separated by 1 px borders; cards use a 1 px border and the `card` background (reference style). Tables keep ruled rows and right-aligned tabular figures.
- **Width:** content column max 72 rem. Reading copy max 40 rem. Works down to 320 px wide.
- **Focus:** 3 px `ring` outline with 2 px offset on every interactive element (`ring` is `primary` in both themes, ≥ 3:1 against the background).
- **Motion:** none decorative. Only instant state changes. `prefers-reduced-motion` is respected anyway.

## Components (built in Phase 3)

- `PricePanel`: chalkboard panel with the crop name, a large price figure, ₹/quintal, the arrival date and change marks.
- `PriceFigure`: formatted rupee figure, tabular, with an optional unit.
- `ChangeMark`: ▲/▼/– symbol, absolute and percentage change, and the comparison period, in `rise`/`fall`/`ink-muted`.
- `DataDate`: "Data from 16 Sep 2026", or "today" when true.
- `SourceNote`: agency, dataset link and GODL-India licence link (SPEC §11).
- `TrendChart`: server-rendered SVG with axes, ₹ ticks, a min–max band, an MSP line, 30/90/365 tabs that work without JavaScript, and a text summary for screen readers.
- `LedgerTable`: ruled table that scrolls horizontally on phones, with a caption.
- `EmptyState` / `ErrorState`: what happened and what to do next.
- `Breadcrumbs`: with `BreadcrumbList` JSON-LD.
- `Button`, `Input`, `Select`, `Card`, `Badge`, `Sheet`, `Separator`, `Table`, `Skeleton`: shadcn primitives (the reference projects' own files where they were generic), restyled to these tokens.
- `SiteHeader` (sticky, blurred, Sheet mobile menu, theme toggle), `SiteFooter`, `SectionHeading`, `LogoMark`.

## Illustration

Artwork is hand-drawn inline SVG built from the same tokens as everything else, not photography:

- `MandiScene`: the home hero — a rate board, sacks, a produce crate, a hanging balance and a ship at the port.
- `ToolArt`: one panel per tool (best mandi, price history, MSP check, export destinations, unit converter, Ask), on the tool cards and at the head of each tool page.
- `CategoryArt`: a glyph per crop category, used on the home category chips, the "browse by category" tiles on `/crops`, the category hubs and each crop page.

Why drawn, not photographed: pages are read outdoors on phones, where photographic heroes cost payload and
contrast; the hero is inside the LCP window and must stay a few kilobytes; stock photography needs licensing;
and an AI-generated "mandi photo" would imply a real place we cannot vouch for, which the rest of the site's
sourcing rules would not allow. Every piece carries no text (nothing to translate, no font to load), adapts to
light and dark through `--panel`, `--highlight`, `--rise`, `--muted` and `--border`, and is marked
`aria-hidden` with `focusable="false"` so screen readers and keyboard users skip it.

## Wireframes (mobile first)

### Home `/`

```
┌──────────────────────────────────────┐
│▓ MANDIPORT              Crops  Tools▓│  chalk header
├──────────────────────────────────────┤
│ Mandi prices and export demand,      │  h1
│ crop by crop.                        │
│ [ Search a crop, market or state  ]  │  48px input
│                                      │
│ Vegetables · Fruits · Cereals ·      │  category links (wrap)
│ Pulses · Spices · Oilseeds · …       │
│──────────────────────────────────────│  rule
│ Biggest price moves                  │  h2
│ Data from 16 Sep 2026                │
│ Onion        ₹2,450  ▲ 12.4% 7 days  │  ledger rows, tabular
│ Tomato       ₹1,180  ▼ 18.0% 7 days  │
│ …                                    │
│──────────────────────────────────────│
│ Tools                                │
│ Best mandi to sell →                 │
│ Price history →  MSP check → …       │
│──────────────────────────────────────│
│ Latest weekly briefs                 │
│──────────────────────────────────────│
│ Source: Agmarknet via data.gov.in …  │  source note
└──────────────────────────────────────┘
```

### Crop hub `/crops/onion`

```
┌──────────────────────────────────────┐
│ Home › Crops › Onion                 │  breadcrumbs
│ Onion prices                         │  h1
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓ National median                     ▓│  chalk price panel
│▓ ₹2,450 /quintal                     ▓│  price-xl
│▓ Data from 16 Sep 2026 · 412 markets ▓│
│▓ ▲ ₹180 (7.9%) vs 7 days             ▓│  change pills
│▓ ▼ ₹90 (3.5%) vs 30 days             ▓│
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│ 2–4 short paragraphs from the data   │
│ Price trend   [30] [90] [365]        │  tabs
│ ┌──────── SVG line + band ────────┐  │
│ └─────────────────────────────────┘  │
│ Highest prices by market             │  ledger table
│ Market · State · ₹ · Date            │
│ Prices by state →                    │
│ Varieties                            │
│ Exports (only if mapped)             │
│ Weekly brief (tier 1) / Ask prompt   │
│ Related crops                        │
│ Source note                          │
└──────────────────────────────────────┘
```

### Best mandi `/tools/best-mandi`

```
┌──────────────────────────────────────┐
│ Best mandi to sell                   │  h1
│ Compare what you would take home     │
│ after transport, using the latest    │
│ prices.                              │
│ Crop        [ Onion            ▾ ]   │
│ Your place  [ Pincode or town     ]  │
│             [ Use my location     ]  │
│ Quantity    [ 20 ] quintals          │
│ Transport   [ 3 ] ₹ per km per qtl   │
│ Max distance[ 150 ] km               │
│ [      Find best mandi      ]        │  chalk button
│──────────────────────────────────────│
│ 1  Lasalgaon APMC, Nashik            │
│    Est. take-home ₹48,200            │  price-lg
│    ₹2,510/qtl on 16 Sep 2026 · 42 km │
│ 2  …                                 │
│ Prices may have changed since the    │
│ date shown. Transport cost is your   │
│ estimate.                            │
└──────────────────────────────────────┘
```

## Review against the brief

- _Generic defaults removed:_ no card grid (lists are ledger rows), no shadows (rules), no gradients, no eyebrow labels. Headings are sentence case and never accent a single word.
- _Distinctive choice spent in one place:_ the chalkboard price panel with large tabular figures and blue/red change pills.
- _Outdoor legibility:_ light paper background, 17 px body, 16.1:1 ink contrast, 44 px targets, no thin weights for figures.
- _Conflicts with references, settled:_
  - NightLore's dark-only theme becomes a single light theme, keeping its ink and paper tokens.
  - Its uppercase eyebrow labels are dropped.
  - HandyAds' violet primary is replaced by chalk green, because violet has no link to the subject world.
