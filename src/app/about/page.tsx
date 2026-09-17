import type { Metadata } from "next";
import Link from "next/link";
import { StaticPage } from "@/components/site/static-page";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "About Mandiport",
  description:
    "Why Mandiport exists, who it is for, and how it uses official Government of India data on mandi prices and exports.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <StaticPage title="About Mandiport" path="/about">
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
    </StaticPage>
  );
}
