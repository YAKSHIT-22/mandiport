import type { Metadata } from "next";
import Link from "next/link";
import { StaticPage } from "@/components/site/static-page";
import { GODL_LICENCE_URL } from "@/lib/sources";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Terms of use",
  description:
    "Terms for using Mandiport, including data licensing, acceptable use of tools and alerts, and limits of liability.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <StaticPage title="Terms of use" path="/terms" updated="17 Sep 2026">
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
    </StaticPage>
  );
}
