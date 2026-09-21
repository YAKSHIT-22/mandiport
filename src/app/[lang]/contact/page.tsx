import type { Metadata } from "next";
import { StaticPage } from "@/components/site/static-page";
import { getDict, getLocale } from "@/lib/i18n/dictionary";
import { ContactForm, type ContactLabels } from "./contact-form";
import { pageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDict();
  return pageMetadata({
    title: t.static.contactTitle,
    description: t.static.contactDescription,
    path: "/contact",
  });
}

function English({ labels }: { labels: ContactLabels }) {
  return (
    <>
      <p>
        Found a wrong figure, a crop in the wrong category, or want your data deleted? Send a message. Please
        include the page address if it is about a specific page.
      </p>
      <ContactForm labels={labels} />
    </>
  );
}

function Hindi({ labels }: { labels: ContactLabels }) {
  return (
    <>
      <p>
        कोई आँकड़ा गलत मिला, कोई फसल गलत श्रेणी में दिखी, या अपना डेटा हटवाना है? संदेश भेजें। अगर बात किसी
        खास पृष्ठ की है तो कृपया उसका पता ज़रूर लिखें।
      </p>
      <ContactForm labels={labels} />
    </>
  );
}

export default async function ContactPage() {
  const t = await getDict();
  const locale = await getLocale();
  return (
    <StaticPage title={t.static.contactTitle} path="/contact">
      {locale === "hi" ? <Hindi labels={t.contact} /> : <English labels={t.contact} />}
    </StaticPage>
  );
}
