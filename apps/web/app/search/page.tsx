import { loadSearchIndexStats } from "../../lib/searchIndex";
import { SiteHeader } from "../components/SiteHeader";
import { SearchClient } from "./SearchClient";

export default function SearchPage() {
  const { total, measured, orphans } = loadSearchIndexStats();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <SiteHeader />

      <h1 className="mt-8 font-display text-3xl">Search the registry</h1>

      <p className="mt-4 text-sm text-muted">
        Covers the npm packages with a stdio transport listed in the official
        MCP registry — not every MCP server that exists.
      </p>

      <p className="mt-6 tabular-nums text-measure">
        {measured} of {total.toLocaleString()} servers measured
      </p>
      <p className="mt-1 text-sm text-muted">
        {orphans} of the measured servers were captured directly from npm and do not
        appear in the registry.
      </p>

      <SearchClient total={total} />
    </main>
  );
}
