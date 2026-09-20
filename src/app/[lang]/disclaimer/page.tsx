import type { Metadata } from "next";
import Link from "next/link";
import { StaticPage } from "@/components/site/static-page";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Disclaimer",
  description:
    "Mandiport shows government data as published. It may be delayed, incomplete or revised, and it is not financial or trading advice.",
  path: "/disclaimer",
});

export default function DisclaimerPage() {
  return (
    <StaticPage title="Disclaimer" path="/disclaimer" updated="17 Sep 2026">
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
    </StaticPage>
  );
}
