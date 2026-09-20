import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/dictionary";
import En from "./guide.en.mdx";
import Hi from "./guide.hi.mdx";

export const metadata: Metadata = {
  title: "How to compare mandis before you sell | Mandiport",
  description:
    "A practical method for choosing where to sell: work out take-home price after transport, weigh quality and timing, and avoid the traps that make a higher quoted price worse.",
  alternates: { canonical: "/guides/compare-mandis" },
};

export default async function CompareMandisGuide() {
  return (await getLocale()) === "hi" ? <Hi /> : <En />;
}
