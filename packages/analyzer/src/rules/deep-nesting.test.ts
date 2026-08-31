import { describe, expect, it } from "vitest";
import { deepNesting } from "./deep-nesting.js";
import { deepNestingTools } from "../../fixtures/synthetic/deep-nesting.js";
import type { RuleContext } from "../types.js";

const ctx: RuleContext = {
  tools: deepNestingTools,
  measurements: {
    perTool: [],
    serverTotalTokens: 0,
    averageTokensPerTool: 0,
    contextWindowTokens: 200_000,
  },
  countTokens: () => 0,
};

const findings = deepNesting.check(ctx);

function findingsFor(toolName: string) {
  return findings.filter((f) => f.toolNames[0] === toolName);
}

describe("deep-nesting rule", () => {
  it("flags a schema nested 4 levels deep", () => {
    const finding = findingsFor("tool_deep_nesting")[0];
    expect(finding).toEqual({
      ruleId: "deep-nesting",
      toolNames: ["tool_deep_nesting"],
      path: ["a", "b", "c", "d"],
      measured: 4,
      threshold: 3,
    });
  });

  it("does not flag the 3-level boundary control", () => {
    expect(findingsFor("tool_boundary_nesting")).toHaveLength(0);
  });

  it("does not flag a schema whose raw path exceeds 3 but whose items-excluded depth is 3", () => {
    expect(findingsFor("tool_items_excluded")).toHaveLength(0);
  });

  it("flags a tied-depth tool exactly once, with the deterministic first-encountered path", () => {
    const matches = findingsFor("tool_tied_depth");
    expect(matches).toHaveLength(1);
    expect(matches[0]).toEqual({
      ruleId: "deep-nesting",
      toolNames: ["tool_tied_depth"],
      path: ["branchA", "p", "q", "r"],
      measured: 4,
      threshold: 3,
    });
  });

  it("does not flag the clean control tool", () => {
    expect(findingsFor("tool_clean")).toHaveLength(0);
  });

  it("produces exactly 2 findings total", () => {
    expect(findings).toHaveLength(2);
  });
});
