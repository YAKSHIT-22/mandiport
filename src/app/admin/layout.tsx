import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/mappings", label: "Export mappings" },
  { href: "/admin/briefs", label: "Briefs" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin mx-auto max-w-6xl px-4 py-6">
      <nav aria-label="Admin" className="mb-6 flex flex-wrap gap-4 border-b pb-3">
        <strong>Mandiport admin</strong>
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="underline underline-offset-4">
            {l.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
