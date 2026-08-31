import type { Report, ToolDef } from "./types.js";
import { measure } from "./measure.js";
import { countTokens, TOKENIZER } from "./tokenize.js";
import { rules } from "./rules/index.js";

export { clusterOverlaps } from "./cluster-overlaps.js";
export type { OverlapCluster } from "./cluster-overlaps.js";
export { describeCoverage } from "./describe-coverage.js";
export type { CoverageSummary, ToolCoverage } from "./describe-coverage.js";

export function analyze(tools: ToolDef[]): Report {
  const measurements = measure(tools);
  const findings = rules.flatMap((rule) => rule.check({ tools, measurements, countTokens }));

  return {
    tokenizer: TOKENIZER,
    measurements,
    findings,
  };
}

export * from "./types.js";
