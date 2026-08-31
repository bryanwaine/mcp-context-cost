import { mkdirSync, writeFileSync } from "node:fs";

const REGISTRY_BASE = "https://registry.modelcontextprotocol.io";
const PAGE_LIMIT = 100;

// Backstop only, to guard against a stuck cursor causing an unbounded loop
// against a live service. The registry catalog is large enough that a real
// full traversal can approach this — if it's ever hit, check
// `data/registry-candidates.json`'s tail against the live registry rather
// than assuming it's a bug.
const MAX_PAGES = 2000;

interface Argument {
  name?: string;
  isRequired?: boolean;
  value?: string;
  default?: string;
}

interface Transport {
  type: string;
}

interface Package {
  registryType: string;
  registryBaseUrl?: string;
  identifier: string;
  version?: string;
  runtimeHint?: string;
  transport: Transport;
  packageArguments?: Argument[];
  environmentVariables?: Argument[];
}

interface RegistryServer {
  name: string;
  description?: string;
  version: string;
  packages?: Package[];
}

interface ServerEntry {
  server: RegistryServer;
}

interface ServersResponse {
  servers: ServerEntry[];
  metadata: {
    nextCursor?: string;
    count: number;
  };
}

interface RegistryCandidate {
  serverName: string;
  description: string;
  serverVersion: string;
  identifier: string;
  packageVersion: string;
  registryBaseUrl?: string;
  runtimeHint?: string;
  requiredPackageArguments: string[];
  requiredEnvironmentVariables: string[];
}

// "(unnamed)" is a placeholder for a required argument the registry declared
// without a name — it is not a real argument name to pass through.
function requiredUnfilledNames(args: Argument[] | undefined): string[] {
  if (!args) return [];
  return args
    .filter((a) => a.isRequired && a.value === undefined && a.default === undefined)
    .map((a) => a.name ?? "(unnamed)");
}

async function fetchPage(cursor: string | undefined): Promise<ServersResponse> {
  const url = new URL("/v0.1/servers", REGISTRY_BASE);
  url.searchParams.set("version", "latest");
  url.searchParams.set("limit", String(PAGE_LIMIT));
  if (cursor) url.searchParams.set("cursor", cursor);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`registry request failed: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as ServersResponse;
}

async function main(): Promise<void> {
  const candidates: RegistryCandidate[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | undefined;
  let serversScanned = 0;
  let pages = 0;
  let complete = true;

  do {
    const page = await fetchPage(cursor);
    serversScanned += page.servers.length;
    pages++;

    for (const { server } of page.servers) {
      for (const pkg of server.packages ?? []) {
        if (pkg.registryType !== "npm" || pkg.transport.type !== "stdio") continue;

        candidates.push({
          serverName: server.name,
          description: server.description ?? "",
          serverVersion: server.version,
          identifier: pkg.identifier,
          packageVersion: pkg.version ?? "latest",
          registryBaseUrl: pkg.registryBaseUrl,
          runtimeHint: pkg.runtimeHint,
          requiredPackageArguments: requiredUnfilledNames(pkg.packageArguments),
          requiredEnvironmentVariables: requiredUnfilledNames(pkg.environmentVariables),
        });
      }
    }

    cursor = page.metadata.nextCursor;

    // A repeated cursor means the registry is not advancing. Without this the
    // loop would run against a live service indefinitely.
    if (cursor && seenCursors.has(cursor)) {
      console.error(`stopping: registry repeated cursor ${cursor}`);
      complete = false;
      break;
    }
    if (cursor) seenCursors.add(cursor);

    if (pages >= MAX_PAGES) {
      console.error(`stopping: hit MAX_PAGES (${MAX_PAGES})`);
      complete = false;
      break;
    }
  } while (cursor);

  candidates.sort((a, b) => a.serverName.localeCompare(b.serverName));

  mkdirSync("data", { recursive: true });
  writeFileSync("data/registry-candidates.json", JSON.stringify(candidates, null, 2));

  const clean = candidates.filter(
    (c) => c.requiredPackageArguments.length === 0 && c.requiredEnvironmentVariables.length === 0,
  );

  console.error(`scanned ${serversScanned} servers across ${pages} pages`);
  console.error(`found ${candidates.length} npm+stdio candidates`);
  console.error(`  ${clean.length} runnable with no extra arguments/env vars`);
  console.error(`  ${candidates.length - clean.length} need manual arguments/env vars`);
  console.error(complete ? "catalog fully traversed" : "WARNING: output is INCOMPLETE");
  console.error(`wrote data/registry-candidates.json`);
}

await main();
