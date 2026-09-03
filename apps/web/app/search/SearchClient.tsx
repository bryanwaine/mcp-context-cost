"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

// Mirrors SearchEntry in scripts/build-search-index.ts by hand — this is a
// client component and must not import from lib/searchIndex.ts (server-only).
interface SearchEntry {
  name: string;
  identifier: string;
  slug: string | null;
}

const RESULT_LIMIT = 100;

function focusRow(list: HTMLUListElement | null, delta: number): void {
  if (!list) return;
  const rows = Array.from(
    list.querySelectorAll<HTMLAnchorElement>("a[data-result]"),
  );
  if (rows.length === 0) return;
  const current = rows.indexOf(document.activeElement as HTMLAnchorElement);
  const next = Math.min(Math.max(current + delta, 0), rows.length - 1);
  rows[next]?.focus();
}

export function SearchClient({
  total,
}: {
  total: number;
}) {
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<SearchEntry[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const resultsRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/search-index.json")
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json() as Promise<SearchEntry[]>;
      })
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const deferredQuery = useDeferredValue(query);

  const matches = useMemo(() => {
    if (!entries) return [];
    const q = deferredQuery.trim().toLowerCase();
    if (q === "") return [];
    const hits = entries.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.identifier.toLowerCase().includes(q),
    );
    // Measured rows first — they're the only rows that lead anywhere on this
    // site. Array.prototype.sort is stable, so registry order holds within
    // each group.
    return hits.sort(
      (a, b) => Number(b.slug !== null) - Number(a.slug !== null),
    );
  }, [entries, deferredQuery]);

  const shown = matches.slice(0, RESULT_LIMIT);

  let status: string;
  if (loadFailed) {
    status = "Could not load the search index. Reload the page to try again.";
  } else if (entries === null) {
    status = "Loading search index…";
  } else if (deferredQuery.trim() === "") {
    status = `Type a server name or npm package to search ${total.toLocaleString()} servers.`;
  } else if (matches.length === 0) {
    status = "No server matches that.";
  } else {
    status = `${matches.length.toLocaleString()} matches`;
  }

  return (
    <div
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          focusRow(resultsRef.current, 1);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          focusRow(resultsRef.current, -1);
        } else if (e.key === "Escape") {
          setQuery("");
        }
      }}
    >
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search the MCP registry"
        autoComplete="off"
        spellCheck={false}
        placeholder="server name or npm package"
        className="mt-4 w-full rounded border border-rule bg-paper px-3 py-2 font-mono text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-measure"
      />

      <p aria-live="polite" className="mt-2 text-sm text-muted">
        {status}
      </p>

      <ul ref={resultsRef} className="mt-4">
        {shown.map((e) => (
          <li
            key={`${e.name}|${e.identifier}`}
            className="border-b border-rule py-2"
          >
            {e.slug !== null ? (
              <Link
                href={`/servers/${e.slug}/`}
                data-result
                className="flex flex-col gap-0.5 font-mono text-sm underline decoration-rule underline-offset-2 hover:text-measure focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-measure sm:flex-row sm:items-baseline sm:justify-between"
              >
                <span className="break-words">{e.name}</span>
                <span className="text-xs text-measure">measured</span>
              </Link>
            ) : (
              <a
                href={`https://www.npmjs.com/package/${e.identifier}`}
                target="_blank"
                rel="noopener"
                data-result
                className="flex flex-col gap-0.5 font-mono text-sm underline decoration-rule underline-offset-2 hover:text-measure focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-measure sm:flex-row sm:items-baseline sm:justify-between"
              >
                <span className="break-words">{e.name}</span>
                <span className="break-all text-xs text-muted">
                  not yet measured — npm ↗
                </span>
              </a>
            )}
          </li>
        ))}
      </ul>

      {matches.length > RESULT_LIMIT ? (
        <p className="mt-3 text-sm text-muted">
          showing first {RESULT_LIMIT} of {matches.length.toLocaleString()}{" "}
          matches — refine your search
        </p>
      ) : null}
    </div>
  );
}
