import Link from "next/link";
import { loadSearchIndexStats } from "../../lib/searchIndex";
import { ThemeToggle } from "../components/ThemeToggle";
import { SearchClient } from "./SearchClient";

export default function SearchPage() {
  const { total, measured } = loadSearchIndexStats();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between border-b border-rule pb-4">
        <Link
          href="/"
          className="text-sm text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-measure"
        >
          <span className="mr-2 font-bold">⇦</span> All servers
        </Link>
        <ThemeToggle />
      </div>

      <h1 className="mt-8 font-display text-3xl">Search the registry</h1>

      <p className="mt-4 text-sm text-muted">
        Covers the npm packages with a stdio transport listed in the official
        MCP registry — not every MCP server that exists.
      </p>

      <p className="mt-6 tabular-nums text-measure">
        {measured} of {total.toLocaleString()} servers measured
      </p>
      <p className="mt-1 text-sm text-muted">
        Two of the measured servers were captured directly from npm and do not
        appear in the registry.
      </p>

      <SearchClient total={total} />
    </main>
  );
}
