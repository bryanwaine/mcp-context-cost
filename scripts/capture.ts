import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { writeFileSync } from "node:fs";

const rawArgs = process.argv.slice(2);
const stdout = rawArgs[0] === "--stdout";
const rest = stdout ? rawArgs.slice(1) : rawArgs;

const name = stdout ? undefined : rest[0];
const [command, ...args] = stdout ? rest : rest.slice(1);

if (!command || (!stdout && !name)) {
  console.error(
    "usage: tsx scripts/capture.ts <name> <command> [args...]\n" +
      "       tsx scripts/capture.ts --stdout <command> [args...]",
  );
  process.exit(1);
}

const client = new Client({ name: "capture", version: "1.0.0" });
await client.connect(new StdioClientTransport({ command, args }));

const result = await client.listTools();
const json = JSON.stringify(result, null, 2);

if (name) {
  writeFileSync(`packages/analyzer/fixtures/real/${name}.json`, json);
} else {
  // stdout mode: the JSON is the only thing on stdout, so it pipes cleanly to
  // pbcopy or a file. The summary below goes to stderr for the same reason.
  console.log(json);
}

console.error(`captured ${result.tools.length} tools${name ? ` -> ${name}.json` : ""}`);

await client.close();
process.exit(0);
