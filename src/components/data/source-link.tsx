"use client";

import { track } from "@/lib/analytics";

export function SourceLink({
  href,
  dataset,
  children,
}: {
  href: string;
  dataset: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="underline"
      target="_blank"
      rel="noopener"
      onClick={() => track("source_link_click", { dataset })}
    >
      {children}
    </a>
  );
}
