import type { Metadata } from "next";
import { getEnv } from "@/env";
import { SourceNote } from "@/components/data/meta";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { EXAMPLE_QUESTIONS } from "@/lib/ai/prompt";
import { getCropBySlug } from "@/lib/queries/crop";
import { pageMetadata } from "@/lib/seo/metadata";
import { AskForm } from "./ask-form";

export const metadata: Metadata = pageMetadata({
  title: "Ask Mandiport about mandi prices",
  description:
    "Ask about mandi prices, MSP or agricultural exports and get a short answer built only from the official data on this site.",
  path: "/ask",
});

type Props = { searchParams: Promise<{ crop?: string }> };

export default async function AskPage({ searchParams }: Props) {
  const { crop: cropSlug } = await searchParams;
  const crop = cropSlug ? await getCropBySlug(cropSlug) : null;
  const configured = Boolean(getEnv().AI_GATEWAY_API_KEY && getEnv().AI_MODEL_ID);
  const examples = crop
    ? [
        `What is the ${crop.name.toLowerCase()} price today?`,
        `Compare ${crop.name.toLowerCase()} prices across markets in Maharashtra`,
        `How has the ${crop.name.toLowerCase()} price changed in the last 30 days?`,
        `Which countries buy Indian ${crop.name.toLowerCase()}?`,
      ]
    : EXAMPLE_QUESTIONS;

  return (
    <main className="container-mp space-y-6 py-6">
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Ask Mandiport", path: "/ask" },
        ]}
      />
      <h1>Ask Mandiport</h1>
      <p className="prose-mp">
        Answers are written by a language model that can only read the official figures in our database, and
        every answer lists the data it used. It does not predict prices or give trading advice.
      </p>
      {!configured && (
        <p className="border-highlight bg-muted border-l-4 px-4 py-3">
          AI answers are not configured on this site yet. The tools and crop pages work as usual.
        </p>
      )}
      <AskForm examples={examples} disabled={!configured} />
      <SourceNote datasets={["mandiVariety", "mandiDaily", "msp", "exports"]} />
    </main>
  );
}
