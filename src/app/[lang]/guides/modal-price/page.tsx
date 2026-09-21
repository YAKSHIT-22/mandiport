import type { Metadata } from "next";
import { GENERAL_GUIDES_HI } from "@/content/guides-hi";
import { getLocale } from "@/lib/i18n/dictionary";
import { pageMetadata } from "@/lib/seo/metadata";
import En from "./guide.en.mdx";
import Hi from "./guide.hi.mdx";

const ENGLISH = {
  title: "What modal price means, and how to read mandi prices",
  description:
    "Modal, minimum and maximum price explained, why a mandi price is per quintal, what arrival dates really tell you, and the traps to avoid when comparing markets.",
};

export async function generateMetadata(): Promise<Metadata> {
  const hindi = GENERAL_GUIDES_HI["modal-price"];
  const copy = (await getLocale()) === "hi" && hindi ? hindi : ENGLISH;
  return pageMetadata({
    title: copy.title,
    description: copy.description,
    path: "/guides/modal-price",
    type: "article",
  });
}

export default async function ModalPriceGuide() {
  return (await getLocale()) === "hi" ? <Hi /> : <En />;
}
