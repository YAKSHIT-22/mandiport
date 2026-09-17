"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import type { CategoryRow, CropListItem } from "@/lib/queries/site";

function Directory({ crops, categories }: { crops: CropListItem[]; categories: CategoryRow[] }) {
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [category, setCategory] = useState(params.get("category") ?? "all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return crops.filter(
      (c) => (category === "all" || c.categorySlug === category) && (!q || c.name.toLowerCase().includes(q)),
    );
  }, [crops, query, category]);
  const major = filtered.filter((c) => c.tier === 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="crop-filter" className="block font-semibold">
            Filter by name
          </label>
          <input
            id="crop-filter"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. onion"
            className="border-input bg-card mt-1 block min-h-12 w-full rounded-sm border px-3"
          />
        </div>
        <div>
          <label htmlFor="category-filter" className="block font-semibold">
            Category
          </label>
          <select
            id="category-filter"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border-input bg-card mt-1 block min-h-12 w-full rounded-sm border px-3"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name} ({c.count})
              </option>
            ))}
          </select>
        </div>
      </div>
      <p aria-live="polite" className="text-sm">
        Showing {filtered.length} of {crops.length} crops
      </p>
      {major.length > 0 && (
        <section aria-labelledby="major-crops">
          <h2 id="major-crops">Most traded</h2>
          <ul className="xs:grid-cols-2 mt-2 grid grid-cols-1 gap-x-6 md:grid-cols-4">
            {major.map((c) => (
              <li key={c.slug} className="border-border border-b">
                <Link
                  href={`/crops/${c.slug}`}
                  className="flex min-h-11 items-center font-semibold underline"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section aria-labelledby="all-crops">
        <h2 id="all-crops">A to Z</h2>
        {filtered.length === 0 ? (
          <p className="mt-2">No crop matches. Try a shorter name or another category.</p>
        ) : (
          <ul className="xs:grid-cols-2 mt-2 grid grid-cols-1 gap-x-6 md:grid-cols-3">
            {filtered.map((c) => (
              <li key={c.slug} className="border-border border-b">
                <Link
                  href={`/crops/${c.slug}`}
                  className="flex min-h-11 flex-wrap items-center gap-x-2 underline"
                >
                  {c.name}
                  {c.tier === 3 && (
                    <span className="text-muted-foreground text-sm no-underline">limited data</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function CropDirectory(props: { crops: CropListItem[]; categories: CategoryRow[] }) {
  return (
    <Suspense fallback={null}>
      <Directory {...props} />
    </Suspense>
  );
}
