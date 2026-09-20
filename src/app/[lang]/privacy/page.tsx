import type { Metadata } from "next";
import Link from "next/link";
import { StaticPage } from "@/components/site/static-page";
import { ConsentControls } from "@/components/site/consent-controls";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Privacy",
  description:
    "What Mandiport collects (analytics only with consent, Telegram chat IDs for alerts), how long it is kept, and how to delete it.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <StaticPage title="Privacy" path="/privacy" updated="17 Sep 2026">
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
    </StaticPage>
  );
}
