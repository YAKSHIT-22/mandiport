import type { Metadata } from "next";
import { GENERAL_GUIDES_HI } from "@/content/guides-hi";
import { getLocale } from "@/lib/i18n/dictionary";
import { pageMetadata } from "@/lib/seo/metadata";
import En from "./guide.en.mdx";
import Hi from "./guide.hi.mdx";

const ENGLISH = {
  title: "MSP explained: what it is and when it applies",
  description:
    "How India's minimum support price is set, which crops have one, what marketing season labels mean, and why mandi prices can sit below MSP without procurement failing.",
};

export async function generateMetadata(): Promise<Metadata> {
  const hindi = GENERAL_GUIDES_HI["msp-explained"];
  const copy = (await getLocale()) === "hi" && hindi ? hindi : ENGLISH;
  return pageMetadata({
    title: copy.title,
    description: copy.description,
    path: "/guides/msp-explained",
    type: "article",
  });
}

export default async function MspGuide() {
  return (await getLocale()) === "hi" ? <Hi /> : <En />;
}
