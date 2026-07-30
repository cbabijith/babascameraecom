"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

interface Suggestion { id: string; name: string; slug: string }

export function SearchBox() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const response = await fetch(
        `/api/search/suggestions?q=${encodeURIComponent(query.trim())}`,
        { signal: controller.signal },
      ).catch(() => null);
      if (!response?.ok) return;
      const body = (await response.json()) as { suggestions?: Suggestion[] };
      setSuggestions(body.suggestions ?? []);
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="relative ml-auto hidden min-w-52 max-w-sm flex-1 md:block">
      <form
        action="/search"
        className="flex items-center rounded-full border border-slate-300 bg-slate-50 px-4"
      >
        <Search className="h-4 w-4 text-slate-500" aria-hidden />
        <input
          name="q"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search cameras, lenses..."
          aria-label="Search products"
          autoComplete="off"
          className="focus-ring h-10 min-w-0 flex-1 bg-transparent px-3 text-sm"
        />
      </form>
      {suggestions.length ? (
        <div className="absolute inset-x-0 top-12 overflow-hidden rounded-xl border border-slate-200 bg-white py-2 shadow-xl">
          {suggestions.map((suggestion) => (
            <Link
              key={suggestion.id}
              href={`/products/${suggestion.slug}`}
              className="block px-4 py-2 text-sm hover:bg-slate-50 hover:text-[#E94560]"
            >
              {suggestion.name}
            </Link>
          ))}
          <Link
            href={`/search?q=${encodeURIComponent(query)}`}
            className="block border-t border-slate-100 px-4 py-2 text-sm font-semibold text-[#E94560]"
          >
            View all results
          </Link>
        </div>
      ) : null}
    </div>
  );
}
