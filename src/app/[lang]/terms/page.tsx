import type { Metadata } from "next";
import Link from "next/link";
import { StaticPage } from "@/components/site/static-page";
import { getDict, getLocale } from "@/lib/i18n/dictionary";
import { GODL_LICENCE_URL } from "@/lib/sources";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Terms of use",
  description:
    "Terms for using Mandiport, including data licensing, acceptable use of tools and alerts, and limits of liability.",
  path: "/terms",
});

function English() {
  return (
    <>
      <p>By using Mandiport you agree to these terms. If you do not agree, please do not use the site.</p>
      <h2>The data</h2>
      <p>
        Government datasets shown on Mandiport are licensed under the{" "}
        <a href={GODL_LICENCE_URL} target="_blank" rel="license noopener">
          Government Open Data License – India
        </a>
        . If you reuse figures, attribute the original source named on each page. Our own text, design and
        calculations may not be republished as a whole without permission.
      </p>
      <h2>Acceptable use</h2>
      <ul>
        <li>
          Do not scrape the site at high rates or try to get around rate limits. Use the official data.gov.in
          API instead.
        </li>
        <li>Do not use the contact form, alerts or Ask Mandiport to send spam or abusive content.</li>
        <li>Do not attempt to access the admin area or interfere with the service.</li>
      </ul>
      <h2>Alerts</h2>
      <p>
        Telegram price alerts are a best-effort convenience. Messages can be delayed or missed, and an alert
        is not a guarantee that a price is available. Send /stop to the bot to end alerts.
      </p>
      <h2>No warranty and limitation of liability</h2>
      <p>
        The service is provided “as is”, without warranties of accuracy, completeness or availability. To the
        extent permitted by law, Mandiport is not liable for losses arising from use of the site or its data.
        See the <Link href="/disclaimer">disclaimer</Link>.
      </p>
      <h2>Changes</h2>
      <p>We may update these terms. The date above shows the latest version.</p>
    </>
  );
}

function Hindi() {
  return (
    <>
      <p>मंडीपोर्ट का उपयोग करके आप इन शर्तों से सहमत होते हैं। सहमत न हों तो कृपया साइट का उपयोग न करें।</p>
      <h2>आँकड़े</h2>
      <p>
        मंडीपोर्ट पर दिखाए गए सरकारी डेटासेट{" "}
        <a href={GODL_LICENCE_URL} target="_blank" rel="license noopener">
          Government Open Data License – India
        </a>{" "}
        के तहत उपलब्ध हैं। आँकड़े दोबारा इस्तेमाल करें तो हर पृष्ठ पर लिखे मूल स्रोत का नाम दें। हमारा अपना
        लेख, डिज़ाइन और गणनाएँ बिना अनुमति पूरी तरह दोबारा प्रकाशित नहीं की जा सकतीं।
      </p>
      <h2>उचित उपयोग</h2>
      <ul>
        <li>
          साइट को तेज़ रफ़्तार से स्क्रैप न करें और न ही दर-सीमा से बचने की कोशिश करें। इसके बजाय आधिकारिक
          data.gov.in एपीआई का उपयोग करें।
        </li>
        <li>
          संपर्क फ़ॉर्म, अलर्ट या मंडीपोर्ट से पूछें का उपयोग स्पैम या अपमानजनक सामग्री भेजने में न करें।
        </li>
        <li>एडमिन क्षेत्र में घुसने या सेवा में बाधा डालने की कोशिश न करें।</li>
      </ul>
      <h2>अलर्ट</h2>
      <p>
        टेलीग्राम भाव अलर्ट यथासंभव प्रयास वाली सुविधा है। संदेश देर से आ सकते हैं या छूट सकते हैं, और अलर्ट
        इस बात की गारंटी नहीं कि वह भाव उपलब्ध है। अलर्ट बंद करने के लिए बॉट को /stop भेजें।
      </p>
      <h2>कोई वारंटी नहीं और देयता की सीमा</h2>
      <p>
        सेवा “जैसी है वैसी” दी जाती है, सटीकता, पूर्णता या उपलब्धता की किसी वारंटी के बिना। कानून की सीमा तक,
        साइट या उसके आँकड़ों के उपयोग से हुए नुकसान के लिए मंडीपोर्ट ज़िम्मेदार नहीं है।{" "}
        <Link href="/disclaimer">अस्वीकरण</Link> देखें।
      </p>
      <h2>बदलाव</h2>
      <p>हम ये शर्तें बदल सकते हैं। ऊपर दी तारीख नवीनतम संस्करण बताती है।</p>
    </>
  );
}

export default async function TermsPage() {
  const t = await getDict();
  const locale = await getLocale();
  return (
    <StaticPage title={t.static.termsTitle} path="/terms" updated="17 Sep 2026">
      {locale === "hi" ? <Hindi /> : <English />}
    </StaticPage>
  );
}
