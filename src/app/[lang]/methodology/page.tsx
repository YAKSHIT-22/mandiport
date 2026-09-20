import type { Metadata } from "next";
import Link from "next/link";
import { StaticPage } from "@/components/site/static-page";
import { TIER_CONFIG, INDEXING } from "@/config/tiers";
import { DATASETS, GODL_LICENCE_URL } from "@/lib/sources";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Methodology: sources, updates and limits",
  description:
    "Where Mandiport’s mandi prices, MSP and export figures come from, how often they update, how medians are calculated, and known limitations.",
  path: "/methodology",
});

export default function MethodologyPage() {
  return (
    <StaticPage title="Methodology" path="/methodology" updated="17 Sep 2026">
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
    </StaticPage>
  );
}
