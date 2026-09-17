import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { SITE_TAGLINE } from "@/lib/seo/site";
import { GODL_LICENCE_URL } from "@/lib/sources";

const COLUMNS = [
  {
    title: "Prices",
    links: [
      { href: "/crops", label: "All crops" },
      { href: "/tools/price-history", label: "Price history" },
      { href: "/tools/best-mandi", label: "Best mandi to sell" },
      { href: "/tools/msp-check", label: "MSP check" },
    ],
  },
  {
    title: "Exports and more",
    links: [
      { href: "/tools/export-destinations", label: "Export destinations" },
      { href: "/tools/unit-converter", label: "Unit converter" },
      { href: "/guides", label: "Guides" },
      { href: "/alerts", label: "Price alerts" },
    ],
  },
  {
    title: "About",
    links: [
      { href: "/about", label: "About Mandiport" },
      { href: "/methodology", label: "Methodology" },
      { href: "/contact", label: "Contact" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/disclaimer", label: "Disclaimer" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-muted/60 mt-20 border-t">
      <div className="container-mp grid gap-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="font-heading mt-3 max-w-xs text-lg font-semibold">{SITE_TAGLINE}</p>
          <p className="text-muted-foreground mt-3 max-w-sm text-sm">
            Every figure comes from Government of India datasets on data.gov.in, shown with the date it refers
            to.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="font-heading text-muted-foreground text-[0.78rem] font-bold tracking-[0.12em] uppercase">
              {col.title}
            </h2>
            <ul className="mt-3">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-muted-foreground hover:text-foreground flex min-h-11 items-center transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="container-mp text-muted-foreground border-t py-6 text-sm">
        <p>
          Data used under the{" "}
          <a href={GODL_LICENCE_URL} className="underline" rel="license noopener" target="_blank">
            Government Open Data License – India
          </a>
          . Not financial or trading advice.
        </p>
      </div>
    </footer>
  );
}
