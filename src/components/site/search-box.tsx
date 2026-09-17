"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

interface Result {
  type: "crop" | "variety" | "market" | "state";
  label: string;
  detail: string;
  href: string;
}

/** Typeahead over /api/search. Works as a plain form (to /crops?q=) without JavaScript. */
export function SearchBox({ placeholder = "Search a crop, market or state" }: { placeholder?: string }) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      controller.current?.abort();
      return;
    }
    const timer = setTimeout(async () => {
      controller.current?.abort();
      controller.current = new AbortController();
      setStatus("loading");
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.current.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { results: Result[] };
        setResults(data.results);
        setStatus("idle");
      } catch (error) {
        if ((error as Error).name !== "AbortError") setStatus("error");
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const showResults = query.trim().length >= 2;

  return (
    <form action="/crops" method="get" role="search" className="relative">
      <label htmlFor={id} className="sr-only">
        Search crops, markets and states
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          name="q"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-describedby={`${id}-status`}
          className="border-input bg-card text-body block min-h-12 w-full rounded-sm border px-3"
        />
        <button
          type="submit"
          className="bg-panel text-panel-foreground min-h-12 rounded-sm px-4 font-semibold"
        >
          Search
        </button>
      </div>
      <p id={`${id}-status`} className="sr-only" aria-live="polite">
        {showResults && status === "idle" ? `${results.length} results` : ""}
      </p>
      {showResults && (
        <div className="border-input bg-card absolute inset-x-0 top-full z-30 mt-1 max-h-96 overflow-y-auto rounded-sm border">
          {status === "error" ? (
            <p className="p-3">Search is not responding. Press Search to see the full crop list.</p>
          ) : results.length === 0 && status === "idle" ? (
            <p className="p-3">No matches. Try another spelling, such as “jeera” or “cumin”.</p>
          ) : (
            <ul>
              {results.map((r) => (
                <li key={`${r.type}:${r.href}:${r.label}`} className="border-border border-b last:border-0">
                  <Link
                    href={r.href}
                    className="hover:bg-muted flex min-h-12 flex-col justify-center px-3 py-2"
                  >
                    <span className="font-semibold">{r.label}</span>
                    <span className="text-muted-foreground text-sm">{r.detail}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
