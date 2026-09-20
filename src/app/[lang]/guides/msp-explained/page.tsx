import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/dictionary";
import En from "./guide.en.mdx";
import Hi from "./guide.hi.mdx";

export const metadata: Metadata = {
  title: "MSP explained: what it is and when it applies | Mandiport",
  description:
    "How India's minimum support price is set, which crops have one, what marketing season labels mean, and why mandi prices can sit below MSP without procurement failing.",
  alternates: { canonical: "/guides/msp-explained" },
};

export default async function MspGuide() {
  return (await getLocale()) === "hi" ? <Hi /> : <En />;
}
