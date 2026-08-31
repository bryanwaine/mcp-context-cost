import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { readFileSync, writeFileSync } from "node:fs";

const CAPTURE_TIMEOUT_MS = 30_000;

interface ApprovedServer {
  name: string;
  identifier: string;
  version: string;
  extraArgs?: string[];
  env?: Record<string, string>;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function captureOne(entry: ApprovedServer): Promise<void> {
  const args = ["-y", `${entry.identifier}@${entry.version}`, ...(entry.extraArgs ?? [])];
  // env is merged with the SDK's curated safe-default environment (see
  // getDefaultEnvironment() in the SDK's stdio transport) — do not widen
  // this to the parent process's full environment.
  const transport = new StdioClientTransport({
    command: "npx",
    args,
    env: entry.env,
  });

  const client = new Client({ name: "ingest-capture", version: "1.0.0" });

  try {
    await withTimeout(client.connect(transport), CAPTURE_TIMEOUT_MS, `connect (${entry.name})`);
    const result = await withTimeout(
      client.listTools(),
      CAPTURE_TIMEOUT_MS,
      `listTools (${entry.name})`,
    );

    writeFileSync(
      `packages/analyzer/fixtures/real/${entry.name}.json`,
      JSON.stringify(result, null, 2),
    );
    console.error(`captured ${result.tools.length} tools -> ${entry.name}.json`);
  } finally {
    // transport.close() kills the child process directly (SIGTERM then
    // SIGKILL). withTimeout() only abandons a hung connect()/listTools()
    // promise — it doesn't stop the underlying operation — so this is what
    // actually reclaims the process on a timeout.
    await transport.close().catch(() => {});
  }
}

async function main(): Promise<void> {
  const approved = JSON.parse(
    readFileSync("scripts/ingest-approved.json", "utf8"),
  ) as ApprovedServer[];

  if (approved.length === 0) {
    console.error("scripts/ingest-approved.json is empty — nothing to capture");
    return;
  }

  let succeeded = 0;
  let failed = 0;

  for (const entry of approved) {
    try {
      await captureOne(entry);
      succeeded++;
    } catch (err) {
      failed++;
      const reason = err instanceof Error ? err.message : String(err);
      console.error(`FAILED ${entry.name} (${entry.identifier}@${entry.version}): ${reason}`);
    }
  }

  console.error(`done: ${succeeded} captured, ${failed} failed`);
}

await main();
