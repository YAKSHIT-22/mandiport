import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/dictionary";
import En from "./guide.en.mdx";
import Hi from "./guide.hi.mdx";

export const metadata: Metadata = {
  title: "How Indian agri export data works | Mandiport",
  description:
    "Annual versus monthly trade figures, principal commodity groups, HS codes, the reporting lag, and how to read export numbers next to mandi prices without over-reading them.",
  alternates: { canonical: "/guides/export-data" },
};

export default async function ExportDataGuide() {
  return (await getLocale()) === "hi" ? <Hi /> : <En />;
}
