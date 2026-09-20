import type { Metadata } from "next";
import Link from "next/link";
import { StaticPage } from "@/components/site/static-page";
import { getDict, getLocale } from "@/lib/i18n/dictionary";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "About Mandiport",
  description:
    "Why Mandiport exists, who it is for, and how it uses official Government of India data on mandi prices and exports.",
  path: "/about",
});

function English() {
  return (
    <>
      <p>
        Mandiport puts the prices from India’s regulated agricultural markets (mandis) next to the country’s
        export figures, one crop at a time. The name joins the two ends of the trade: the market yard where
        produce is first sold, and the port it may later leave from.
      </p>
      <h2>Who it is for</h2>
      <p>
        Traders, commission agents, farmer producer organisations, small exporters and farmers who follow the
        market. The pages are built for a phone, used outdoors, by people who need a number and its date
        quickly.
      </p>
      <h2>What makes it different</h2>
      <ul>
        <li>
          <strong>Price history we collect ourselves.</strong> The government’s daily price feed only shows
          the current day, so we store it every day and also load the published historical series.
        </li>
        <li>
          <strong>Mandi prices and exports on one page.</strong> Crops are linked to export groups through a
          reviewed mapping.
        </li>
        <li>
          <strong>AI that only explains official numbers.</strong> Weekly briefs and answers are generated
          from figures in our database, labelled as AI-assisted, and never offer predictions or trading
          advice.
        </li>
      </ul>
      <h2>Data and independence</h2>
      <p>
        All figures come from datasets published on the Open Government Data Platform India (data.gov.in)
        under the Government Open Data License – India. Mandiport is not affiliated with any government
        department. See the <Link href="/methodology">methodology</Link> for sources, update times and
        limitations, and the <Link href="/disclaimer">disclaimer</Link> before relying on any figure.
      </p>
      <p>
        Questions or corrections: <Link href="/contact">contact us</Link>.
      </p>
    </>
  );
}

function Hindi() {
  return (
    <>
      <p>
        मंडीपोर्ट भारत की नियंत्रित कृषि मंडियों के भाव और देश के निर्यात के आँकड़े एक साथ, एक-एक फसल के हिसाब
        से रखता है। नाम में कारोबार के दोनों सिरे हैं: वह मंडी जहाँ उपज पहली बार बिकती है, और वह बंदरगाह जहाँ
        से वह आगे जा सकती है।
      </p>
      <h2>यह किसके लिए है</h2>
      <p>
        व्यापारी, आढ़तिये, किसान उत्पादक संगठन, छोटे निर्यातक और वे किसान जो बाज़ार पर नज़र रखते हैं। पृष्ठ
        फोन के लिए बने हैं, खुले में पढ़ने के लिए, उन लोगों के लिए जिन्हें कोई आँकड़ा और उसकी तारीख जल्दी
        चाहिए।
      </p>
      <h2>यह अलग कैसे है</h2>
      <ul>
        <li>
          <strong>भाव का इतिहास हम खुद जुटाते हैं।</strong> सरकारी रोज़ाना फ़ीड सिर्फ़ उसी दिन का भाव दिखाती
          है, इसलिए हम उसे हर दिन सहेजते हैं और प्रकाशित पुरानी शृंखला भी लोड करते हैं।
        </li>
        <li>
          <strong>मंडी भाव और निर्यात एक ही पृष्ठ पर।</strong> फसलें एक जाँची-परखी मैपिंग से निर्यात श्रेणियों
          से जुड़ी हैं।
        </li>
        <li>
          <strong>एआई जो सिर्फ़ सरकारी आँकड़े समझाता है।</strong> साप्ताहिक रिपोर्ट और जवाब हमारे डेटाबेस के
          आँकड़ों से बनते हैं, एआई-सहायित बताए जाते हैं, और कभी भविष्यवाणी या व्यापारिक सलाह नहीं देते।
        </li>
      </ul>
      <h2>आँकड़े और स्वतंत्रता</h2>
      <p>
        सभी आँकड़े Open Government Data Platform India (data.gov.in) पर Government Open Data License – India
        के तहत प्रकाशित डेटासेट से आते हैं। मंडीपोर्ट किसी सरकारी विभाग से संबद्ध नहीं है। स्रोत, अपडेट का समय
        और सीमाओं के लिए <Link href="/methodology">कार्यप्रणाली</Link> देखें, और किसी आँकड़े पर भरोसा करने से
        पहले <Link href="/disclaimer">अस्वीकरण</Link> पढ़ें।
      </p>
      <p>
        सवाल या सुधार: <Link href="/contact">हमसे संपर्क करें</Link>।
      </p>
    </>
  );
}

export default async function AboutPage() {
  const t = await getDict();
  const locale = await getLocale();
  return (
    <StaticPage title={t.static.aboutTitle} path="/about">
      {locale === "hi" ? <Hindi /> : <English />}
    </StaticPage>
  );
}
