import type { Rule, Finding } from "../types.js";
import { walkSchema } from "../schema-walk.js";

const THRESHOLD = 3;

// Depth excludes "items" hops: an array of objects costs one level of nesting
// to produce as a JSON literal, not two. Known limitation — a property
// literally named "items" is miscounted, since this filters by segment value
// rather than by origin.
function nonItemsDepth(path: readonly string[]): number {
  return path.filter((segment) => segment !== "items").length;
}

export const deepNesting: Rule = {
  id: "deep-nesting",
  scope: "tool",
  check: ({ tools }) => {
    const findings: Finding[] = [];
    for (const tool of tools) {
      let deepestPath: string[] | undefined;
      let deepestDepth = 0;
      for (const node of walkSchema(tool.inputSchema)) {
        const depth = nonItemsDepth(node.path);
        if (depth > deepestDepth) {
          deepestDepth = depth;
          deepestPath = node.path;
        }
      }
      if (deepestPath && deepestDepth > THRESHOLD) {
        // One finding per tool, at its deepest node. Depth findings cascade from a
        // single structural cause and are fixed by one change, unlike missing
        // descriptions which are independently fixable.
        findings.push({
          ruleId: "deep-nesting",
          toolNames: [tool.name],
          path: deepestPath,
          measured: deepestDepth,
          threshold: THRESHOLD,
        });
      }
    }
    return findings;
  },
};
