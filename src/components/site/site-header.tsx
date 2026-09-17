import Link from "next/link";
import { Search } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { MobileNav } from "./mobile-nav";
import { NavLinks, type NavItem } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

export const NAV_ITEMS: NavItem[] = [
  { href: "/crops", label: "Crops" },
  { href: "/tools", label: "Tools" },
  { href: "/briefs", label: "Briefs" },
  { href: "/guides", label: "Guides" },
];

const EXTRA: NavItem[] = [
  { href: "/ask", label: "Ask Mandiport" },
  { href: "/alerts", label: "Price alerts" },
  { href: "/methodology", label: "Methodology" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  return (
    <header className="bg-background/85 sticky top-0 z-40 border-b backdrop-blur-xl">
      <div className="container-mp flex h-16 items-center gap-2">
        <MobileNav items={NAV_ITEMS} extra={EXTRA} />
        <Logo />
        <nav aria-label="Primary" className="ml-4 hidden md:block">
          <NavLinks items={NAV_ITEMS} />
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/crops" aria-label="Search crops">
              <Search />
            </Link>
          </Button>
          <ThemeToggle />
          <Button size="sm" className="xs:inline-flex hidden" asChild>
            <Link href="/ask">Ask Mandiport</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
