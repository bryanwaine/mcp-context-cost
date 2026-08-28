import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { writeFileSync } from "node:fs";

const [name, command, ...args] = process.argv.slice(2);
if (!name || !command) {
  console.error("usage: tsx scripts/capture.ts <name> <command> [args...]");
  process.exit(1);
}

const client = new Client({ name: "capture", version: "1.0.0" });
await client.connect(new StdioClientTransport({ command, args }));

const result = await client.listTools();
writeFileSync(
  `packages/analyzer/fixtures/real/${name}.json`,
  JSON.stringify(result, null, 2)
);
console.error(`captured ${result.tools.length} tools -> ${name}.json`);

await client.close();
process.exit(0);