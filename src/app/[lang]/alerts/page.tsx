import type { Metadata } from "next";
import { getEnv } from "@/env";
import { SourceNote } from "@/components/data/meta";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { getCropOptions, getStateOptions } from "@/lib/queries/tools";
import { pageMetadata } from "@/lib/seo/metadata";
import { AlertForm } from "./alert-form";

export const revalidate = 21600;

export const metadata: Metadata = pageMetadata({
  title: "Telegram price alerts for mandi crops",
  description:
    "Get a Telegram message when a crop's mandi price crosses the level you choose. No account, no phone number: just a chat with the bot.",
  path: "/alerts",
});

export default async function AlertsPage({ searchParams }: { searchParams: Promise<{ crop?: string }> }) {
  const [{ crop }, crops, states] = await Promise.all([searchParams, getCropOptions(), getStateOptions()]);
  const botConfigured = Boolean(getEnv().TELEGRAM_BOT_TOKEN);

  return (
    <main className="container-mp space-y-6 py-6">
      <Breadcrumbs
        crumbs={[
          { name: "Home", path: "/" },
          { name: "Price alerts", path: "/alerts" },
        ]}
      />
      <h1>Price alerts on Telegram</h1>
      <div className="prose-mp space-y-3">
        <p>
          We send a Telegram message when the price you are watching crosses your level. We store only the
          Telegram chat ID and your alert settings: no name, no phone number, no account.
        </p>
        <ol className="list-decimal space-y-2 pl-6">
          <li>
            Open the Mandiport bot in Telegram and send <strong>/start</strong>.
          </li>
          <li>The bot replies with a 6-character code, valid for 30 minutes.</li>
          <li>Enter that code below with the crop and price you want to watch.</li>
        </ol>
        <p>
          Send <strong>/stop</strong> to the bot at any time to delete your alerts and chat ID.
        </p>
      </div>
      {!botConfigured && (
        <p className="border-highlight bg-muted border-l-4 px-4 py-3">
          Alerts are not configured on this site yet. The bot link will appear here once it is.
        </p>
      )}
      <AlertForm crops={crops} states={states} initialCrop={crop} disabled={!botConfigured} />
      <SourceNote datasets={["mandiVariety", "mandiDaily"]} />
    </main>
  );
}
