import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const HERE = dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = join(HERE, "../apps/web/public/search-index.json");
const FIXTURES_DIR = join(HERE, "../packages/analyzer/fixtures/real");

interface SearchEntry {
  name: string;
  identifier: string;
  slug: string | null;
}

describe("search-index.json / fixtures/real consistency", () => {
  const entries = JSON.parse(readFileSync(INDEX_PATH, "utf8")) as SearchEntry[];
  const fixtureSlugs = new Set(
    readdirSync(FIXTURES_DIR)
      .filter((file) => file.endsWith(".json"))
      .map((file) => file.replace(/\.json$/, "")),
  );
  const indexSlugs = new Set(
    entries.map((e) => e.slug).filter((slug): slug is string => slug !== null),
  );

  it("every non-null slug in the index has a matching fixture file", () => {
    const missing = [...indexSlugs].filter((slug) => !fixtureSlugs.has(slug));
    expect(missing).toEqual([]);
  });

  it("every fixture file appears as some entry's slug in the index", () => {
    const missing = [...fixtureSlugs].filter((slug) => !indexSlugs.has(slug));
    expect(missing).toEqual([]);
  });
});
