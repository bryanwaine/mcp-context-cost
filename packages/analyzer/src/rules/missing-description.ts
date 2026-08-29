import type { Rule, Finding } from "../types.js";
import { walkSchema } from "../schema-walk.js";

function isMissing(description: string | undefined): boolean {
  return !description || description.trim().length === 0;
}

export const missingDescription: Rule = {
  id: "missing-description",
  scope: "tool",
  check: ({ tools }) => {
    const findings: Finding[] = [];
    for (const tool of tools) {
      if (isMissing(tool.description)) {
        findings.push({ ruleId: "missing-description", toolNames: [tool.name] });
      }
      for (const node of walkSchema(tool.inputSchema)) {
        if (isMissing(node.schema.description)) {
          findings.push({
            ruleId: "missing-description",
            toolNames: [tool.name],
            path: node.path,
          });
        }
      }
    }
    return findings;
  },
};
