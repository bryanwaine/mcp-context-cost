import { encode } from "gpt-tokenizer";
import { readFileSync } from "node:fs";

const { tools } = JSON.parse(
  readFileSync("packages/analyzer/fixtures/real/questdb.json", "utf8"),
);

let total = 0;
for (const t of tools) {
  const n = encode(JSON.stringify(t)).length;
  total += n;
  console.log(String(n).padStart(5), t.name);
}
console.log("---");
console.log(String(total).padStart(5), `TOTAL across ${tools.length} tools`);
