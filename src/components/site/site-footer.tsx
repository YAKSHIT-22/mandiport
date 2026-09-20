import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import type { Dictionary } from "@/content/i18n/en";
import { getDict } from "@/lib/i18n/dictionary";
import { GODL_LICENCE_URL } from "@/lib/sources";

function columns(t: Dictionary) {
  return [
    {
      title: t.footer.prices,
      links: [
        { href: "/crops", label: t.footer.allCrops },
        { href: "/tools/price-history", label: t.footer.priceHistory },
        { href: "/tools/best-mandi", label: t.footer.bestMandi },
        { href: "/tools/msp-check", label: t.footer.mspCheck },
      ],
    },
    {
      title: t.footer.exportsAndMore,
      links: [
        { href: "/tools/export-destinations", label: t.footer.exportDestinations },
        { href: "/tools/unit-converter", label: t.footer.unitConverter },
        { href: "/guides", label: t.footer.guides },
        { href: "/alerts", label: t.footer.alerts },
      ],
    },
    {
      title: t.footer.about,
      links: [
        { href: "/about", label: t.footer.aboutMandiport },
        { href: "/methodology", label: t.footer.methodology },
        { href: "/contact", label: t.footer.contact },
        { href: "/privacy", label: t.footer.privacy },
        { href: "/terms", label: t.footer.terms },
        { href: "/disclaimer", label: t.footer.disclaimer },
      ],
    },
  ];
}

export async function SiteFooter() {
  const t = await getDict();
  const COLUMNS = columns(t);
  return (
    <footer className="bg-muted/60 mt-20 border-t">
      <div className="container-mp grid gap-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="font-heading mt-3 max-w-xs text-lg font-semibold">{t.meta.tagline}</p>
          <p className="text-muted-foreground mt-3 max-w-sm text-sm">{t.footer.tagline}</p>
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
          {t.footer.licence}{" "}
          <a href={GODL_LICENCE_URL} className="underline" rel="license noopener" target="_blank">
            {t.footer.licenceName}
          </a>
          . {t.footer.notAdvice}
        </p>
      </div>
    </footer>
  );
}
