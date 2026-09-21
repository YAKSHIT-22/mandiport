import type { Metadata } from "next";
import Link from "next/link";
import { StaticPage } from "@/components/site/static-page";
import { getDict, getLocale } from "@/lib/i18n/dictionary";
import { ConsentControls } from "@/components/site/consent-controls";
import { pageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDict();
  return pageMetadata({
    title: t.static.privacyTitle,
    description: t.static.privacyDescription,
    path: "/privacy",
  });
}

function English() {
  return (
    <>
      <p>
        Mandiport does not have user accounts and does not ask for your name, phone number or location to show
        prices. We collect as little as we can.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Analytics, only if you accept.</strong> Google Analytics 4 counts page views and which tools
          are used (for example, “best mandi tool used for onion”). It does not receive your name, contact
          details or the text you type. If you decline, analytics does not load.
        </li>
        <li>
          <strong>Telegram chat ID, only if you set up an alert.</strong> We store the chat ID Telegram gives
          us, plus the crop, place and threshold you choose. We do not store your Telegram name or phone
          number.
        </li>
        <li>
          <strong>Contact messages.</strong> The name, email address and message you send through the contact
          form, to reply to you.
        </li>
        <li>
          <strong>Location for the best mandi tool.</strong> If you allow browser location or enter a pincode,
          it is used for that search only and is not stored against you. Distance lookups are cached without
          identifying you.
        </li>
        <li>
          <strong>Technical logs.</strong> Our hosting provider records IP addresses in server logs for
          security. We use IP addresses only to apply rate limits, in short-lived counters.
        </li>
      </ul>
      <h2>How long we keep it</h2>
      <ul>
        <li>Alert data: until you send /stop to the bot, or ask us to delete it.</li>
        <li>Contact messages: up to 12 months.</li>
        <li>Rate-limit counters: minutes to a day.</li>
      </ul>
      <h2>Your choices and deletion</h2>
      <ul>
        <li>Stop alerts and delete your chat ID: send /stop to the Mandiport bot.</li>
        <li>
          Delete a contact message or ask what we hold: use the <Link href="/contact">contact form</Link>.
        </li>
        <li>Change your analytics choice here:</li>
      </ul>
      <ConsentControls />
      <h2>India’s data protection law</h2>
      <p>
        We intend to comply with the Digital Personal Data Protection Act, 2023: collecting only what a
        feature needs, using it for that purpose, keeping it no longer than necessary, and honouring requests
        to access, correct or erase your data. This policy will be reviewed with a qualified professional
        before launch.
      </p>
    </>
  );
}

function Hindi() {
  return (
    <>
      <p>
        मंडीपोर्ट पर कोई खाता नहीं होता और भाव दिखाने के लिए हम आपका नाम, फ़ोन नंबर या जगह नहीं माँगते। हम
        जितना कम हो सके उतना ही जुटाते हैं।
      </p>
      <h2>हम क्या जुटाते हैं</h2>
      <ul>
        <li>
          <strong>एनालिटिक्स, सिर्फ़ आपकी अनुमति से।</strong> Google Analytics 4 पृष्ठ दृश्य और यह गिनता है कि
          कौन-से टूल इस्तेमाल हुए (जैसे “प्याज के लिए बेस्ट मंडी टूल”)। उसे आपका नाम, संपर्क या आपका लिखा पाठ
          नहीं मिलता। मना करने पर एनालिटिक्स लोड ही नहीं होता।
        </li>
        <li>
          <strong>टेलीग्राम चैट आईडी, सिर्फ़ अलर्ट लगाने पर।</strong> हम टेलीग्राम से मिली चैट आईडी, और आपकी
          चुनी फसल, जगह व सीमा रखते हैं। आपका टेलीग्राम नाम या फ़ोन नंबर नहीं रखते।
        </li>
        <li>
          <strong>संपर्क संदेश।</strong> संपर्क फ़ॉर्म से भेजा गया नाम, ईमेल पता और संदेश, ताकि जवाब दिया जा
          सके।
        </li>
        <li>
          <strong>बेस्ट मंडी टूल के लिए जगह।</strong> ब्राउज़र लोकेशन की अनुमति दें या पिनकोड डालें, तो उसका
          उपयोग सिर्फ़ उसी खोज के लिए होता है और वह आपके नाम से नहीं रखा जाता। दूरी की जानकारी बिना आपकी पहचान
          के सहेजी जाती है।
        </li>
        <li>
          <strong>तकनीकी लॉग।</strong> सुरक्षा के लिए हमारा होस्टिंग प्रदाता सर्वर लॉग में आईपी पते दर्ज करता
          है। हम आईपी पते का उपयोग सिर्फ़ दर-सीमा लगाने के लिए, थोड़े समय के काउंटर में करते हैं।
        </li>
      </ul>
      <h2>हम इसे कितने समय रखते हैं</h2>
      <ul>
        <li>अलर्ट का डेटा: जब तक आप बॉट को /stop न भेजें, या हमें हटाने को न कहें।</li>
        <li>संपर्क संदेश: अधिकतम 12 महीने।</li>
        <li>दर-सीमा के काउंटर: कुछ मिनट से एक दिन तक।</li>
      </ul>
      <h2>आपके विकल्प और डेटा हटाना</h2>
      <ul>
        <li>अलर्ट बंद करें और चैट आईडी हटाएँ: मंडीपोर्ट बॉट को /stop भेजें।</li>
        <li>
          संपर्क संदेश हटवाएँ या पूछें कि हमारे पास क्या है: <Link href="/contact">संपर्क फ़ॉर्म</Link> का
          उपयोग करें।
        </li>
        <li>एनालिटिक्स का अपना विकल्प यहाँ बदलें:</li>
      </ul>
      <ConsentControls />
      <h2>भारत का डेटा संरक्षण कानून</h2>
      <p>
        हमारा इरादा डिजिटल पर्सनल डेटा प्रोटेक्शन एक्ट, 2023 का पालन करना है: उतना ही जुटाना जितना किसी सुविधा
        के लिए ज़रूरी है, उसी काम में उसका उपयोग करना, ज़रूरत से ज़्यादा समय तक न रखना, और डेटा देखने, सुधारने
        या मिटाने के अनुरोध का सम्मान करना। इस नीति की जाँच शुरुआत से पहले किसी योग्य पेशेवर से कराई जाएगी।
      </p>
    </>
  );
}

export default async function PrivacyPage() {
  const t = await getDict();
  const locale = await getLocale();
  return (
    <StaticPage title={t.static.privacyTitle} path="/privacy" updated="17 Sep 2026">
      {locale === "hi" ? <Hindi /> : <English />}
    </StaticPage>
  );
}
