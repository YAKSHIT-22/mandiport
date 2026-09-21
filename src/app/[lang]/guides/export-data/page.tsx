import type { Metadata } from "next";
import { GENERAL_GUIDES_HI } from "@/content/guides-hi";
import { getLocale } from "@/lib/i18n/dictionary";
import { pageMetadata } from "@/lib/seo/metadata";
import En from "./guide.en.mdx";
import Hi from "./guide.hi.mdx";

const ENGLISH = {
  title: "How Indian agri export data works",
  description:
    "Annual versus monthly trade figures, principal commodity groups, HS codes, the reporting lag, and how to read export numbers next to mandi prices without over-reading them.",
};

export async function generateMetadata(): Promise<Metadata> {
  const hindi = GENERAL_GUIDES_HI["export-data"];
  const copy = (await getLocale()) === "hi" && hindi ? hindi : ENGLISH;
  return pageMetadata({
    title: copy.title,
    description: copy.description,
    path: "/guides/export-data",
    type: "article",
  });
}

export default async function ExportDataGuide() {
  return (await getLocale()) === "hi" ? <Hi /> : <En />;
}
