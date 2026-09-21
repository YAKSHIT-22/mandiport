import type { Metadata } from "next";
import { GENERAL_GUIDES_HI } from "@/content/guides-hi";
import { getLocale } from "@/lib/i18n/dictionary";
import { pageMetadata } from "@/lib/seo/metadata";
import En from "./guide.en.mdx";
import Hi from "./guide.hi.mdx";

const ENGLISH = {
  title: "How to compare mandis before you sell",
  description:
    "A practical method for choosing where to sell: work out take-home price after transport, weigh quality and timing, and avoid the traps that make a higher quoted price worse.",
};

export async function generateMetadata(): Promise<Metadata> {
  const hindi = GENERAL_GUIDES_HI["compare-mandis"];
  const copy = (await getLocale()) === "hi" && hindi ? hindi : ENGLISH;
  return pageMetadata({
    title: copy.title,
    description: copy.description,
    path: "/guides/compare-mandis",
    type: "article",
  });
}

export default async function CompareMandisGuide() {
  return (await getLocale()) === "hi" ? <Hi /> : <En />;
}
