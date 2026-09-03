import "server-only";

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = join(HERE, "../public/search-index.json");

export interface SearchIndexStats {
  total: number;
  measured: number;
}

// Rows only need `slug` to compute the stats below — this deliberately
// doesn't return the full index, since shipping all ~7,800 entries into the
// server-rendered HTML would defeat the point of fetching it separately in
// the browser.
export function loadSearchIndexStats(): SearchIndexStats {
  let raw: string;
  try {
    raw = readFileSync(INDEX_PATH, "utf-8");
  } catch {
    throw new Error(
      "apps/web/public/search-index.json is missing or unreadable — run `npm run build:index`",
    );
  }
  const rows = JSON.parse(raw) as { slug: string | null }[];
  const measuredSlugs = new Set(
    rows.map((r) => r.slug).filter((slug): slug is string => slug !== null),
  );
  return { total: rows.length, measured: measuredSlugs.size };
}
