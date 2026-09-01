import "server-only";

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ToolDef } from "@mcp-context-cost/analyzer";

// Resolved from this module's own location rather than process.cwd(), so it
// holds regardless of where the build was invoked from — `npm run build` at
// the repo root, `npm run build` inside apps/web, or `next dev` directly.
// cwd-relative paths work for the first of those and fail confusingly for the
// others, with an ENOENT that looks like a missing fixture.
const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(HERE, "../../../packages/analyzer/fixtures/real");

export function listServerSlugs(): string[] {
  return readdirSync(FIXTURES_DIR)
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.replace(/\.json$/, ""))
    .sort();
}

export function loadServer(slug: string): { tools: ToolDef[] } {
  const raw = readFileSync(join(FIXTURES_DIR, `${slug}.json`), "utf-8");
  const parsed = JSON.parse(raw) as { tools: unknown };
  return { tools: parsed.tools as ToolDef[] };
}
