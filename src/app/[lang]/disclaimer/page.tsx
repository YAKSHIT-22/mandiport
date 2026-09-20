import type { Metadata } from "next";
import Link from "next/link";
import { StaticPage } from "@/components/site/static-page";
import { getDict, getLocale } from "@/lib/i18n/dictionary";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Disclaimer",
  description:
    "Mandiport shows government data as published. It may be delayed, incomplete or revised, and it is not financial or trading advice.",
  path: "/disclaimer",
});

function English() {
  return (
    <>
      <p>
        Mandiport presents data as published by Government of India sources on the Open Government Data
        Platform India (data.gov.in). We do not collect prices from markets ourselves.
      </p>
      <ul>
        <li>
          <strong>Data may be delayed, incomplete or revised.</strong> Markets report irregularly, some report
          late, and sources can correct figures after publication.
        </li>
        <li>
          <strong>Not financial or trading advice.</strong> Nothing on this site recommends buying, selling or
          holding any commodity. Past prices and seasonal patterns do not predict future prices.
        </li>
        <li>
          <strong>Verify before you transact.</strong> Confirm prices, quality requirements, fees and
          transport costs with the market or buyer before making a decision.
        </li>
        <li>
          <strong>Estimates are estimates.</strong> Tool results such as take-home price after transport
          depend on figures you enter and on distances from a mapping service.
        </li>
        <li>
          <strong>AI-assisted text</strong> is generated from our database and labelled. It can still contain
          mistakes; the figures and dates shown alongside it are the reference.
        </li>
      </ul>
      <p>
        Mandiport is not affiliated with any government department, APMC or exchange. See the{" "}
        <Link href="/terms">terms of use</Link> and <Link href="/methodology">methodology</Link>.
      </p>
    </>
  );
}

function Hindi() {
  return (
    <>
      <p>
        मंडीपोर्ट आँकड़े वैसे ही दिखाता है जैसे भारत सरकार के स्रोत उन्हें Open Government Data Platform India
        (data.gov.in) पर प्रकाशित करते हैं। हम खुद मंडियों से भाव इकट्ठा नहीं करते।
      </p>
      <ul>
        <li>
          <strong>आँकड़े देर से आ सकते हैं, अधूरे हो सकते हैं या बदल सकते हैं।</strong> मंडियाँ अनियमित रूप से
          रिपोर्ट देती हैं, कुछ देर से देती हैं, और स्रोत प्रकाशन के बाद आँकड़े सुधार सकते हैं।
        </li>
        <li>
          <strong>यह वित्तीय या व्यापारिक सलाह नहीं है।</strong> इस साइट पर कुछ भी किसी जिंस को खरीदने, बेचने
          या रोकने की सिफ़ारिश नहीं करता। पुराने भाव और मौसमी रुझान आगे के भाव नहीं बताते।
        </li>
        <li>
          <strong>सौदे से पहले जाँच लें।</strong> फैसला लेने से पहले मंडी या खरीदार से भाव, गुणवत्ता की
          शर्तें, शुल्क और ढुलाई का खर्च पक्का कर लें।
        </li>
        <li>
          <strong>अनुमान सिर्फ़ अनुमान हैं।</strong> ढुलाई के बाद हाथ में आने वाले भाव जैसे नतीजे आपके डाले
          आँकड़ों और मैपिंग सेवा की दूरी पर निर्भर करते हैं।
        </li>
        <li>
          <strong>एआई-सहायित लेख</strong> हमारे डेटाबेस से बनता है और ऐसा बताया भी जाता है। फिर भी उसमें गलती
          हो सकती है; साथ दिखाए गए आँकड़े और तारीखें ही असली संदर्भ हैं।
        </li>
      </ul>
      <p>
        मंडीपोर्ट किसी सरकारी विभाग, एपीएमसी या एक्सचेंज से संबद्ध नहीं है।{" "}
        <Link href="/terms">उपयोग की शर्तें</Link> और <Link href="/methodology">कार्यप्रणाली</Link> देखें।
      </p>
    </>
  );
}

export default async function DisclaimerPage() {
  const t = await getDict();
  const locale = await getLocale();
  return (
    <StaticPage title={t.static.disclaimerTitle} path="/disclaimer" updated="17 Sep 2026">
      {locale === "hi" ? <Hindi /> : <English />}
    </StaticPage>
  );
}
