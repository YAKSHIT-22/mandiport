import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Devanagari, Space_Grotesk } from "next/font/google";
import { getEnv } from "@/env";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { JsonLd } from "@/components/site/json-ld";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/seo/site";
import { SiteProviders } from "@/components/site/site-providers";
import { themeScript } from "@/components/site/theme-toggle";
import { getDict, getLocale } from "@/lib/i18n/dictionary";
import { HTML_LANG, LOCALES } from "@/lib/i18n/config";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
// Headings only, so it is not preloaded: the h1 paints immediately in the fallback face and
// swaps when the webfont arrives, which keeps the largest paint early on slow connections.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
  weight: ["600", "700"],
  preload: false,
  adjustFontFallback: true,
});
// Devanagari loads on Hindi pages only, so English pages carry none of its weight.
const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-devanagari",
  display: "swap",
  weight: ["400", "600", "700"],
});

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

const env = getEnv();

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: { default: `${SITE_NAME}: ${SITE_TAGLINE}`, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  formatDetection: { telephone: false, address: false, email: false },
  ...(env.NEXT_PUBLIC_GSC_VERIFICATION ? { verification: { google: env.NEXT_PUBLIC_GSC_VERIFICATION } } : {}),
};

export const viewport: Viewport = {
  themeColor: "#1e3a2f",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const t = await getDict();
  const fonts = [inter.variable, spaceGrotesk.variable, locale === "hi" ? notoDevanagari.variable : ""]
    .filter(Boolean)
    .join(" ");
  return (
    // The theme script adds `dark` to <html> before hydration, which React would otherwise flag.
    <html lang={HTML_LANG[locale]} className={fonts} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="bg-primary text-primary-foreground sr-only z-50 rounded-md px-4 py-3 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          {t.chrome.skipToContent}
        </a>
        <SiteHeader />
        <SiteProviders
          needsConsent={Boolean(env.NEXT_PUBLIC_GA_MEASUREMENT_ID)}
          labels={{
            title: t.consent.title,
            body: t.consent.body,
            bodyLink: t.consent.privacyPage,
            accept: t.consent.accept,
            decline: t.consent.decline,
          }}
        >
          <div id="main" className="flex-1">
            {children}
          </div>
        </SiteProviders>
        <SiteFooter />
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      </body>
    </html>
  );
}
