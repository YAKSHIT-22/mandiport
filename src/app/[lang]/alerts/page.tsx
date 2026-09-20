import type { Metadata } from "next";
import { getEnv } from "@/env";
import { getDict } from "@/lib/i18n/dictionary";
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
  const t = await getDict();
  const [{ crop }, crops, states] = await Promise.all([searchParams, getCropOptions(), getStateOptions()]);
  const botConfigured = Boolean(getEnv().TELEGRAM_BOT_TOKEN);

  return (
    <main className="container-mp space-y-6 py-6">
      <Breadcrumbs
        crumbs={[
          { name: t.chrome.home, path: "/" },
          { name: t.footer.alerts, path: "/alerts" },
        ]}
      />
      <h1>{t.pages.alertsTitle}</h1>
      <div className="prose-mp space-y-3">
        <p>{t.pages.alertsIntro}</p>
        <ol className="list-decimal space-y-2 pl-6">
          <li>
            {t.pages.alertsStep1Before} <strong>/start</strong>.
          </li>
          <li>{t.pages.alertsStep2}</li>
          <li>{t.pages.alertsStep3}</li>
        </ol>
        <p>
          {t.pages.alertsStopBefore} <strong>/stop</strong> {t.pages.alertsStopAfter}
        </p>
      </div>
      {!botConfigured && (
        <p className="border-highlight bg-muted border-l-4 px-4 py-3">{t.pages.alertsNotConfigured}</p>
      )}
      <AlertForm
        crops={crops}
        states={states}
        initialCrop={crop}
        disabled={!botConfigured}
        labels={t.alerts}
      />
      <SourceNote datasets={["mandiVariety", "mandiDaily"]} />
    </main>
  );
}
