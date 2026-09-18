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
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
  weight: ["600", "700"],
});
// Loaded on demand for Hindi text only (preload off keeps English pages light).
const notoDeva = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-noto-deva",
  display: "swap",
  weight: ["400", "600"],
  preload: false,
});

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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${spaceGrotesk.variable} ${notoDeva.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="bg-primary text-primary-foreground sr-only z-50 rounded-md px-4 py-3 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          Skip to content
        </a>
        <SiteHeader />
        <SiteProviders needsConsent={Boolean(env.NEXT_PUBLIC_GA_MEASUREMENT_ID)}>
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
