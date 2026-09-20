import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/dictionary";
import En from "./guide.en.mdx";
import Hi from "./guide.hi.mdx";

export const metadata: Metadata = {
  title: "What modal price means, and how to read mandi prices | Mandiport",
  description:
    "Modal, minimum and maximum price explained, why a mandi price is per quintal, what arrival dates really tell you, and the traps to avoid when comparing markets.",
  alternates: { canonical: "/guides/modal-price" },
};

export default async function ModalPriceGuide() {
  return (await getLocale()) === "hi" ? <Hi /> : <En />;
}
