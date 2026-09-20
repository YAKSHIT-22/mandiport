import type { Metadata } from "next";
import { StaticPage } from "@/components/site/static-page";
import { getDict, getLocale } from "@/lib/i18n/dictionary";
import { ContactForm } from "./contact-form";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description:
    "Report a data problem, suggest a crop category or export mapping, or ask Mandiport to delete your data.",
  path: "/contact",
});

function English() {
  return (
    <>
      <p>
        Found a wrong figure, a crop in the wrong category, or want your data deleted? Send a message. Please
        include the page address if it is about a specific page.
      </p>
      <ContactForm />
    </>
  );
}

function Hindi() {
  return (
    <>
      <p>
        कोई आँकड़ा गलत मिला, कोई फसल गलत श्रेणी में दिखी, या अपना डेटा हटवाना है? संदेश भेजें। अगर बात किसी
        खास पृष्ठ की है तो कृपया उसका पता ज़रूर लिखें।
      </p>
      <ContactForm />
    </>
  );
}

export default async function ContactPage() {
  const t = await getDict();
  const locale = await getLocale();
  return (
    <StaticPage title={t.static.contactTitle} path="/contact">
      {locale === "hi" ? <Hindi /> : <English />}
    </StaticPage>
  );
}
