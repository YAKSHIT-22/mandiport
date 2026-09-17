/** Guide registry (SPEC §9.5). Guide bodies live in src/content/guides/*.mdx (Phase 6). */
export interface GuideMeta {
  slug: string;
  title: string;
  description: string;
  updated: string;
  crop?: string;
}

export const GUIDES: GuideMeta[] = [];
