import type { Rule, Finding } from "../types.js";
import { trigramSimilarity } from "../similarity.js";

const THRESHOLD = 0.6;

export const toolOverlap: Rule = {
  id: "tool-overlap",
  scope: "server",
  check: ({ tools }) => {
    const findings: Finding[] = [];
    for (let i = 0; i < tools.length; i++) {
      for (let j = i + 1; j < tools.length; j++) {
        const similarity = trigramSimilarity(tools[i].name, tools[j].name);
        if (similarity > THRESHOLD) {
          findings.push({
            ruleId: "tool-overlap",
            toolNames: [tools[i].name, tools[j].name].sort(),
            measured: similarity,
            threshold: THRESHOLD,
          });
        }
      }
    }
    return findings;
  },
};
