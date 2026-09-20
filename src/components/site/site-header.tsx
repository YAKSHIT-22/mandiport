import Link from "next/link";
import { Search } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { getDict, getLocale } from "@/lib/i18n/dictionary";
import type { Dictionary } from "@/content/i18n/en";
import { LanguageToggle } from "./language-toggle";
import { MobileNav } from "./mobile-nav";
import { NavLinks, type NavItem } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

export function navItems(t: Dictionary): NavItem[] {
  return [
    { href: "/crops", label: t.nav.crops },
    { href: "/tools", label: t.nav.tools },
    { href: "/briefs", label: t.nav.briefs },
    { href: "/guides", label: t.nav.guides },
  ];
}

function extraItems(t: Dictionary): NavItem[] {
  return [
    { href: "/ask", label: t.chrome.askCta },
    { href: "/alerts", label: t.footer.alerts },
    { href: "/methodology", label: t.footer.methodology },
    { href: "/about", label: t.footer.about },
  ];
}

export async function SiteHeader() {
  const [t, locale] = await Promise.all([getDict(), getLocale()]);
  const NAV_ITEMS = navItems(t);
  const EXTRA = extraItems(t);
  return (
    <header className="bg-background/85 sticky top-0 z-40 border-b backdrop-blur-xl">
      <div className="container-mp flex h-16 items-center gap-2">
        <MobileNav
          items={NAV_ITEMS}
          extra={EXTRA}
          labels={{
            open: t.chrome.openMenu,
            close: t.chrome.closeMenu,
            menu: t.chrome.menu,
            tagline: t.meta.tagline,
          }}
        />
        <Logo />
        <nav aria-label={t.chrome.primaryNav} className="ml-4 hidden md:block">
          <NavLinks items={NAV_ITEMS} />
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/crops" aria-label={t.chrome.search}>
              <Search />
            </Link>
          </Button>
          <LanguageToggle locale={locale} label={t.meta.switchTo} />
          <ThemeToggle labels={{ toLight: t.chrome.toLight, toDark: t.chrome.toDark }} />
          <Button size="sm" className="xs:inline-flex hidden" asChild>
            <Link href="/ask">{t.chrome.askCta}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
