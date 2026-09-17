import type { Metadata } from "next";
import { SITE_NAME, siteUrl } from "./site";

/** Title ≤ 60 chars and description ≤ 155 chars (SPEC §9.1), trimmed at word boundaries. */
export function clampText(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:–-]+$/, "")}…`;
}

export function pageMetadata({
  title,
  description,
  path,
  index = true,
  ogImage,
  type = "website",
}: {
  title: string;
  description: string;
  path: string;
  index?: boolean;
  ogImage?: string;
  type?: "website" | "article";
}): Metadata {
  const fullTitle = clampText(title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`, 60);
  const desc = clampText(description, 155);
  const url = siteUrl(path);
  return {
    title: { absolute: fullTitle },
    description: desc,
    alternates: { canonical: url },
    robots: index ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      title: fullTitle,
      description: desc,
      url,
      siteName: SITE_NAME,
      type,
      locale: "en_IN",
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630 }] } : {}),
    },
    twitter: { card: "summary_large_image", title: fullTitle, description: desc },
  };
}
