import type { Rule, Finding } from "../types.js";
import { walkSchema } from "../schema-walk.js";

const THRESHOLD = 20;

export const largeEnum: Rule = {
  id: "large-enum",
  scope: "tool",
  check: ({ tools, countTokens }) => {
    const findings: Finding[] = [];
    for (const tool of tools) {
      for (const node of walkSchema(tool.inputSchema)) {
        const values = node.schema.enum;
        if (!values || values.length <= THRESHOLD) continue;
        findings.push({
          ruleId: "large-enum",
          toolNames: [tool.name],
          path: node.path,
          measured: values.length,
          threshold: THRESHOLD,
          // Tokenizes the enum array's own JSON.stringify output (brackets,
          // commas, and all) — the array's serialized cost, not the sum of
          // its values counted individually. Same single-pass-vs-summed
          // distinction as serverTotalTokens (see measure.ts).
          tokenCost: countTokens(values),
        });
      }
    }
    return findings;
  },
};
