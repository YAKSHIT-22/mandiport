import type { Metadata } from "next";
import Link from "next/link";
import { StaticPage } from "@/components/site/static-page";
import { getDict, getLocale } from "@/lib/i18n/dictionary";
import { TIER_CONFIG, INDEXING } from "@/config/tiers";
import { DATASETS, GODL_LICENCE_URL } from "@/lib/sources";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Methodology: sources, updates and limits",
  description:
    "Where Mandiport’s mandi prices, MSP and export figures come from, how often they update, how medians are calculated, and known limitations.",
  path: "/methodology",
});

function English() {
  return (
    <>
      <h2>Sources</h2>
      <ul>
        {Object.values(DATASETS).map((d) => (
          <li key={d.key}>
            <a href={d.pageUrl} target="_blank" rel="noopener">
              {d.title}
            </a>{" "}
            ({d.agency}).
          </li>
        ))}
      </ul>
      <p>
        All datasets are published on data.gov.in under the{" "}
        <a href={GODL_LICENCE_URL} target="_blank" rel="license noopener">
          Government Open Data License – India
        </a>
        . We use only the official API. We do not scrape any website.
      </p>

      <h2>When prices update</h2>
      <ul>
        <li>
          Twice a day (around 20:30 and 07:30 IST) we collect the <em>current daily price</em> snapshot. These
          figures are provisional: markets keep reporting through the day and some report late.
        </li>
        <li>
          The <em>variety-wise daily market prices</em> dataset is published the next day. When it arrives for
          a date and state, it replaces the provisional figures for that date and state.
        </li>
        <li>
          Every price is shown with its arrival date. We say “today” only when the data is from today’s date
          in India. Many markets do not report every day, so the latest date for one market can be several
          days old.
        </li>
      </ul>

      <h2>What the prices mean</h2>
      <ul>
        <li>Prices are in rupees per quintal (100 kg) unless a page says otherwise.</li>
        <li>
          <strong>Modal price</strong> is the price at which most of the produce traded that day in that
          market. Minimum and maximum prices are also reported.
        </li>
        <li>
          <strong>Market price</strong>: when a market reports several varieties or grades of a crop on one
          day, we take the median of their modal prices.
        </li>
        <li>
          <strong>State and national medians</strong> are the middle value of the market prices reported on
          that date. A median is less affected by one unusual market than an average.
        </li>
        <li>
          <strong>Changes</strong> compare the latest date with the nearest earlier date that has data, up to
          three days either side of 7 or 30 days before.
        </li>
        <li>
          <strong>Biggest price moves</strong> only include widely traded crops reported by at least 10
          markets on both dates.
        </li>
      </ul>

      <h2>History we keep</h2>
      <p>
        Daily prices are kept for 400 days. Older data is kept as weekly and monthly averages for each market.
        Seasonality (“highest average months”) is shown only once a market has at least 12 months of data.
      </p>

      <h2>Rows we reject</h2>
      <p>
        We do not display rows with a missing market or crop name, an invalid date, a price of zero or less, a
        minimum above the maximum, or a modal price outside the minimum–maximum range. In our checks this
        affects well under 1% of rows.
      </p>

      <h2>How much data a crop has</h2>
      <ul>
        <li>
          <strong>Major crops</strong>: at least {TIER_CONFIG.tier1.minMarkets} markets and{" "}
          {TIER_CONFIG.tier1.minDays} reporting days in the last {TIER_CONFIG.windowDays} days. They get
          weekly briefs.
        </li>
        <li>
          <strong>Regular crops</strong>: at least {TIER_CONFIG.tier2.minMarkets} markets and{" "}
          {TIER_CONFIG.tier2.minDays} reporting days.
        </li>
        <li>
          <strong>Limited-data crops</strong>: everything else. Their pages carry a note and are not submitted
          to search engines.
        </li>
        <li>
          State pages are submitted to search engines only with at least {INDEXING.state.minMarkets} markets
          and {INDEXING.state.minDays} reporting days in 90 days, and market pages only with{" "}
          {INDEXING.market.minDays} reporting days in {INDEXING.market.windowDays}.
        </li>
      </ul>

      <h2>Minimum support prices</h2>
      <p>
        MSP figures come from two published tables. We show them by marketing season: the rabi MSP announced
        for crop year 2024-25 applies to the 2025-26 rabi marketing season. At the time of writing, kharif
        MSPs for 2025-26 were not yet available through the data.gov.in API, so the latest kharif MSP shown is
        for 2024-25. MSP is the price at which the government procures; most mandi sales are not procurement.
      </p>

      <h2>Exports</h2>
      <p>
        Export figures are annual (April–March), by principal commodity group and destination country, in US$
        million, from the Department of Commerce. The latest year on data.gov.in is 2022-23, and no 2020-21
        figures are published there. Many crops only map to a broad group such as “fresh vegetables”. A crop’s
        page says when a mapping has not yet been reviewed. HS codes are entered by a person, never guessed.
      </p>

      <h2>AI-assisted text</h2>
      <p>
        Weekly briefs and answers from <Link href="/ask">Ask Mandiport</Link> are written by a language model
        from figures in our database only. Briefs are reviewed before publishing. They are labelled, cite
        their data dates, and never predict prices or advise buying or selling.
      </p>

      <h2>Known limitations</h2>
      <ul>
        <li>No trading volumes: the daily price data does not include arrival quantities.</li>
        <li>Market names and spellings sometimes change, and some markets report irregularly.</li>
        <li>Official data can be revised or withdrawn after we collect it.</li>
      </ul>
      <p>
        Spotted a problem? <Link href="/contact">Tell us</Link>.
      </p>
    </>
  );
}

function Hindi() {
  return (
    <>
      <h2>स्रोत</h2>
      <ul>
        {Object.values(DATASETS).map((d) => (
          <li key={d.key}>
            <a href={d.pageUrl} target="_blank" rel="noopener">
              {d.title}
            </a>{" "}
            ({d.agency})।
          </li>
        ))}
      </ul>
      <p>
        सभी डेटासेट data.gov.in पर{" "}
        <a href={GODL_LICENCE_URL} target="_blank" rel="license noopener">
          Government Open Data License – India
        </a>{" "}
        के तहत प्रकाशित हैं। हम सिर्फ़ आधिकारिक एपीआई का उपयोग करते हैं। हम किसी वेबसाइट को स्क्रैप नहीं करते।
      </p>

      <h2>भाव कब अपडेट होते हैं</h2>
      <ul>
        <li>
          दिन में दो बार (करीब 20:30 और 07:30 IST) हम <em>चालू दिन के भाव</em> का स्नैपशॉट लेते हैं। ये आँकड़े
          अस्थायी होते हैं: मंडियाँ दिनभर रिपोर्ट देती रहती हैं और कुछ देर से देती हैं।
        </li>
        <li>
          <em>किस्म-वार दैनिक मंडी भाव</em> डेटासेट अगले दिन प्रकाशित होता है। किसी तारीख और राज्य के लिए वह
          आते ही उस तारीख और राज्य के अस्थायी आँकड़ों की जगह ले लेता है।
        </li>
        <li>
          हर भाव उसकी आवक तारीख के साथ दिखता है। हम “आज” तभी कहते हैं जब आँकड़े भारत की आज की तारीख के हों। कई
          मंडियाँ रोज़ रिपोर्ट नहीं देतीं, इसलिए किसी मंडी की ताज़ा तारीख कई दिन पुरानी हो सकती है।
        </li>
      </ul>

      <h2>इन भावों का मतलब</h2>
      <ul>
        <li>जब तक किसी पृष्ठ पर और न लिखा हो, भाव रुपये प्रति क्विंटल (100 किलो) में हैं।</li>
        <li>
          <strong>मॉडल भाव</strong> वह भाव है जिस पर उस दिन उस मंडी में सबसे ज़्यादा उपज बिकी। न्यूनतम और
          अधिकतम भाव भी दर्ज होते हैं।
        </li>
        <li>
          <strong>मंडी का भाव</strong>: जब कोई मंडी एक दिन में किसी फसल की कई किस्में या श्रेणियाँ दर्ज करती
          है, तो हम उनके मॉडल भावों का मध्य मान लेते हैं।
        </li>
        <li>
          <strong>राज्य और राष्ट्रीय मध्य भाव</strong> उस तारीख को दर्ज मंडी भावों का बीच वाला मान हैं। औसत के
          मुकाबले मध्य मान पर किसी एक असामान्य मंडी का असर कम पड़ता है।
        </li>
        <li>
          <strong>बदलाव</strong> ताज़ा तारीख की तुलना उससे पहले की सबसे नज़दीकी उस तारीख से करते हैं जिसके
          आँकड़े हों — 7 या 30 दिन पहले के तीन दिन इधर-उधर तक।
        </li>
        <li>
          <strong>सबसे बड़े बदलाव</strong> में सिर्फ़ वे बड़ी फसलें आती हैं जिनकी दोनों तारीखों पर कम से कम 10
          मंडियों ने रिपोर्ट दी हो।
        </li>
      </ul>

      <h2>हम कितना इतिहास रखते हैं</h2>
      <p>
        रोज़ के भाव 400 दिन तक रखे जाते हैं। उससे पुराने आँकड़े हर मंडी के साप्ताहिक और मासिक औसत के रूप में
        रहते हैं। मौसमी रुझान (“सबसे ऊँचे औसत वाले महीने”) तभी दिखता है जब किसी मंडी के कम से कम 12 महीने के
        आँकड़े हों।
      </p>

      <h2>जिन पंक्तियों को हम छोड़ देते हैं</h2>
      <p>
        हम वे पंक्तियाँ नहीं दिखाते जिनमें मंडी या फसल का नाम न हो, तारीख गलत हो, भाव शून्य या उससे कम हो,
        न्यूनतम अधिकतम से ऊपर हो, या मॉडल भाव न्यूनतम–अधिकतम की सीमा से बाहर हो। हमारी जाँच में ऐसी पंक्तियाँ
        1% से भी काफ़ी कम रहीं।
      </p>

      <h2>किसी फसल के कितने आँकड़े हैं</h2>
      <ul>
        <li>
          <strong>बड़ी फसलें</strong>: पिछले {TIER_CONFIG.windowDays} दिनों में कम से कम{" "}
          {TIER_CONFIG.tier1.minMarkets} मंडियाँ और {TIER_CONFIG.tier1.minDays} रिपोर्ट वाले दिन। इनकी
          साप्ताहिक रिपोर्ट बनती है।
        </li>
        <li>
          <strong>सामान्य फसलें</strong>: कम से कम {TIER_CONFIG.tier2.minMarkets} मंडियाँ और{" "}
          {TIER_CONFIG.tier2.minDays} रिपोर्ट वाले दिन।
        </li>
        <li>
          <strong>सीमित आँकड़ों वाली फसलें</strong>: बाकी सब। इनके पृष्ठों पर सूचना रहती है और इन्हें सर्च
          इंजन को नहीं भेजा जाता।
        </li>
        <li>
          राज्य पृष्ठ सर्च इंजन को तभी भेजे जाते हैं जब 90 दिनों में कम से कम {INDEXING.state.minMarkets}{" "}
          मंडियाँ और {INDEXING.state.minDays} रिपोर्ट वाले दिन हों, और मंडी पृष्ठ तभी जब{" "}
          {INDEXING.market.windowDays} में {INDEXING.market.minDays} रिपोर्ट वाले दिन हों।
        </li>
      </ul>

      <h2>न्यूनतम समर्थन मूल्य</h2>
      <p>
        एमएसपी के आँकड़े दो प्रकाशित तालिकाओं से आते हैं। हम उन्हें विपणन वर्ष के हिसाब से दिखाते हैं: फसल
        वर्ष 2024-25 के लिए घोषित रबी एमएसपी 2025-26 के रबी विपणन वर्ष पर लागू होता है। लिखे जाने के समय तक
        2025-26 के खरीफ एमएसपी data.gov.in एपीआई पर उपलब्ध नहीं थे, इसलिए दिखाया गया ताज़ा खरीफ एमएसपी 2024-25
        का है। एमएसपी वह भाव है जिस पर सरकार खरीद करती है; मंडी की ज़्यादातर बिक्री सरकारी खरीद नहीं होती।
      </p>

      <h2>निर्यात</h2>
      <p>
        निर्यात के आँकड़े सालाना (अप्रैल–मार्च), मुख्य जिंस श्रेणी और गंतव्य देश के हिसाब से, अमेरिकी डॉलर
        मिलियन में, वाणिज्य विभाग से आते हैं। data.gov.in पर ताज़ा वर्ष 2022-23 है, और वहाँ 2020-21 के आँकड़े
        प्रकाशित नहीं हैं। कई फसलें सिर्फ़ किसी मोटी श्रेणी जैसे “ताज़ी सब्ज़ियाँ” से जुड़ती हैं। जिस फसल की
        मैपिंग अभी जाँची नहीं गई, उसके पृष्ठ पर यह लिखा रहता है। एचएस कोड व्यक्ति द्वारा दर्ज किए जाते हैं,
        अंदाज़े से कभी नहीं।
      </p>

      <h2>एआई-सहायित लेख</h2>
      <p>
        साप्ताहिक रिपोर्ट और <Link href="/ask">मंडीपोर्ट से पूछें</Link> के जवाब एक भाषा मॉडल सिर्फ़ हमारे
        डेटाबेस के आँकड़ों से लिखता है। रिपोर्ट प्रकाशन से पहले जाँची जाती हैं। उन पर लेबल रहता है, वे अपने
        आँकड़ों की तारीखें बताती हैं, और कभी भाव की भविष्यवाणी या खरीद-बिक्री की सलाह नहीं देतीं।
      </p>

      <h2>ज्ञात सीमाएँ</h2>
      <ul>
        <li>कारोबार की मात्रा नहीं: रोज़ाना भाव के आँकड़ों में आवक की मात्रा शामिल नहीं होती।</li>
        <li>मंडियों के नाम और वर्तनी कभी-कभी बदलते हैं, और कुछ मंडियाँ अनियमित रिपोर्ट देती हैं।</li>
        <li>सरकारी आँकड़े हमारे जुटाने के बाद सुधारे या हटाए जा सकते हैं।</li>
      </ul>
      <p>
        कोई गड़बड़ दिखी? <Link href="/contact">हमें बताएँ</Link>।
      </p>
    </>
  );
}

export default async function MethodologyPage() {
  const t = await getDict();
  const locale = await getLocale();
  return (
    <StaticPage title={t.static.methodologyTitle} path="/methodology" updated="17 Sep 2026">
      {locale === "hi" ? <Hindi /> : <English />}
    </StaticPage>
  );
}
