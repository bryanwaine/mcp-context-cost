// scripts/smoke.ts
import { analyze } from "../packages/analyzer/src/index.js";
import { readFileSync } from "node:fs";

const { tools } = JSON.parse(
  readFileSync("packages/analyzer/fixtures/real/playwright.json", "utf8")
);

console.log(JSON.stringify(analyze(tools), null, 2).slice(0))