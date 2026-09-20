"use client";

import { Menu } from "lucide-react";
import { useState } from "react";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NavLinks, type NavItem } from "./nav-links";

export interface NavLabels {
  open: string;
  close: string;
  menu: string;
  tagline: string;
}

export function MobileNav({
  items,
  extra,
  labels,
}: {
  items: NavItem[];
  extra: NavItem[];
  labels: NavLabels;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label={labels.open}>
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[86vw] max-w-sm p-0">
        <SheetHeader className="border-b p-5">
          <SheetTitle className="font-heading flex items-center gap-2">
            <LogoMark className="size-7" /> Mandiport
          </SheetTitle>
          <SheetDescription>{labels.tagline}</SheetDescription>
        </SheetHeader>
        <nav aria-label={labels.menu} className="flex flex-col gap-4 overflow-y-auto p-3">
          <NavLinks items={items} vertical onNavigate={close} />
          <div className="border-t pt-3">
            <NavLinks items={extra} vertical onNavigate={close} />
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
