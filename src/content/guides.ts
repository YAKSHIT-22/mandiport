/** Guide registry (SPEC §9.5), used by the guides index and the sitemap. */
export interface GuideMeta {
  slug: string;
  title: string;
  description: string;
  updated: string;
  /** Set for per-crop guides. */
  crop?: string;
}

import { CROP_GUIDES } from "./crop-guides";

const GENERAL_GUIDES: GuideMeta[] = [
  {
    slug: "modal-price",
    title: "What modal price means, and how to read mandi prices",
    description:
      "Modal, minimum and maximum prices, quintals, arrival dates, and the traps to avoid when comparing markets.",
    updated: "2026-09-17",
  },
  {
    slug: "compare-mandis",
    title: "How to compare mandis before you sell",
    description:
      "Work out take-home price after transport, weigh quality and timing, and sanity-check an unusual price.",
    updated: "2026-09-17",
  },
  {
    slug: "msp-explained",
    title: "MSP explained: what it is, and when it applies",
    description:
      "How support prices are set, which crops have them, marketing-season labels, and what MSP does not guarantee.",
    updated: "2026-09-17",
  },
  {
    slug: "export-data",
    title: "How Indian agricultural export data works",
    description:
      "Annual figures, broad commodity groups, HS codes, the publication lag, and how exports relate to mandi prices.",
    updated: "2026-09-17",
  },
];

/** Crop guides live under /guides/crops/<slug> and are data-driven (SPEC §9.5 item 5). */
export const GUIDES: GuideMeta[] = [
  ...GENERAL_GUIDES,
  ...CROP_GUIDES.map((g) => ({
    slug: `crops/${g.slug}`,
    title: g.title,
    description: g.description,
    updated: g.updated,
    crop: g.slug,
  })),
];
