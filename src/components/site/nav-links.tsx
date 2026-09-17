"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
}

export function NavLinks({
  items,
  vertical = false,
  onNavigate,
}: {
  items: NavItem[];
  vertical?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <ul className={cn("flex", vertical ? "flex-col gap-1" : "items-center gap-0.5")}>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "font-heading text-muted-foreground hover:text-foreground flex min-h-11 items-center rounded-md border-b-2 border-transparent px-3 font-semibold transition-colors",
                active && "border-primary text-foreground",
                vertical && "border-b-0 border-l-2 px-4",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
