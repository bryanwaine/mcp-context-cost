import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";

const CANDIDATES_PATH = "data/registry-candidates.json";
const APPROVED_PATH = "scripts/ingest-approved.json";
const FIXTURES_DIR = "packages/analyzer/fixtures/real";
const PUBLIC_DIR = "apps/web/public";
const OUTPUT_PATH = "apps/web/public/search-index.json";

// Deliberate subsets of the full interfaces in ingest-discover.ts and
// ingest-capture.ts — this script only reads the fields it joins on.
interface RegistryCandidate {
  serverName: string;
  identifier: string;
}

interface ApprovedServer {
  name: string;
  identifier: string;
}

// Mirrored by hand in apps/web/app/search/SearchClient.tsx. The two can't
// import each other: this script runs under the root tsconfig, and the
// client copy must not reach into anything under apps/web/lib (server-only).
interface SearchEntry {
  name: string;
  identifier: string;
  slug: string | null;
}

function main(): void {
  if (!existsSync(CANDIDATES_PATH)) {
    console.error(`${CANDIDATES_PATH} not found — run \`npm run ingest:discover\` first`);
    console.error("(it is gitignored and regenerated on each run)");
    process.exit(1);
  }

  const candidates = JSON.parse(readFileSync(CANDIDATES_PATH, "utf8")) as RegistryCandidate[];
  const approved = JSON.parse(readFileSync(APPROVED_PATH, "utf8")) as ApprovedServer[];

  const fixtureSlugs = readdirSync(FIXTURES_DIR)
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.replace(/\.json$/, ""))
    .sort();

  if (fixtureSlugs.length === 0) {
    console.error(`WARNING: no fixtures found in ${FIXTURES_DIR} — every entry will be unmeasured`);
  }

  const fixtureSlugSet = new Set(fixtureSlugs);
  const identifierToSlug = new Map<string, string>();

  for (const entry of approved) {
    if (!fixtureSlugSet.has(entry.name)) continue;
    const existing = identifierToSlug.get(entry.identifier);
    if (existing !== undefined && existing !== entry.name) {
      console.error(
        `WARNING: identifier ${entry.identifier} is claimed by both ${existing} and ${entry.name} in ${APPROVED_PATH} — keeping ${existing}`,
      );
      continue;
    }
    identifierToSlug.set(entry.identifier, entry.name);
  }

  const placedSlugs = new Set<string>();
  const entries: SearchEntry[] = candidates.map((c) => {
    const slug = identifierToSlug.get(c.identifier) ?? null;
    if (slug !== null) placedSlugs.add(slug);
    return { name: c.serverName, identifier: c.identifier, slug };
  });

  // Counted over `candidates`, before orphans are appended below. Counting
  // over `entries` afterwards would fold the orphans in and make the
  // duplicate-listing check below fire on every run.
  const registryRows = candidates.filter((c) => identifierToSlug.has(c.identifier)).length;

  // Fixtures captured outside the registry pipeline (via scripts/capture.ts
  // directly) have no recorded identifier anywhere, so they can't be joined
  // to a registry-candidates.json row. Append them as synthetic entries so
  // every fixture stays searchable even though it isn't part of the registry
  // dump.
  const orphans = fixtureSlugs.filter((slug) => !placedSlugs.has(slug));
  for (const slug of orphans) {
    entries.push({ name: slug, identifier: "", slug });
  }

  mkdirSync(PUBLIC_DIR, { recursive: true });
  // No pretty-printing, unlike every other write in scripts/ — this file
  // ships to every visitor, and pretty-printing would cost roughly 4x the
  // bytes for no benefit (each entry is a single short object, so per-entry
  // diffs stay readable minified).
  const json = JSON.stringify(entries);
  writeFileSync(OUTPUT_PATH, json);

  // Distinct servers, not rows: 245 identifiers in the registry dump appear
  // under more than one serverName, so one measured package could produce
  // several rows. The page's "N of M measured" line must use this count.
  const measuredSlugs = new Set(
    entries.map((e) => e.slug).filter((slug): slug is string => slug !== null),
  ).size;

  console.error(`read ${candidates.length} registry candidates`);
  console.error(`found ${fixtureSlugs.length} fixtures in ${FIXTURES_DIR}`);
  console.error(`joined ${registryRows} registry rows to ${placedSlugs.size} measured slugs`);
  console.error(
    orphans.length === 0
      ? "no orphan fixtures"
      : `appended ${orphans.length} orphan fixtures with no registry match: ${orphans.join(", ")}`,
  );
  console.error(
    `wrote ${OUTPUT_PATH} (${entries.length} entries, ${Buffer.byteLength(json)} bytes, ${measuredSlugs} measured servers)`,
  );

  if (registryRows > placedSlugs.size) {
    console.error(
      `note: ${registryRows - placedSlugs.size} measured package(s) are listed under more than one registry name`,
    );
  }

  if (placedSlugs.size + orphans.length !== fixtureSlugs.length) {
    console.error(
      "WARNING: placed + orphan slugs do not add up to the fixture count — some fixture is neither joined nor appended",
    );
  }
}

main();
