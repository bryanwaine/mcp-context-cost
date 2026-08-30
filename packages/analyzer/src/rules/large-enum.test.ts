import { describe, expect, it } from "vitest";
import { largeEnum } from "./large-enum.js";
import { largeEnumTools } from "../../fixtures/synthetic/large-enum.js";
import type { RuleContext } from "../types.js";

// Distinguishes "was passed the enum array" from "was passed the whole
// schema": only an array gets the marker value, so a finding's tokenCost
// proves which one the rule actually tokenized.
const countTokens = (value: unknown): number => (Array.isArray(value) ? 999 : 0);

const ctx: RuleContext = {
  tools: largeEnumTools,
  measurements: {
    perTool: [],
    serverTotalTokens: 0,
    averageTokensPerTool: 0,
    contextWindowTokens: 200_000,
  },
  countTokens,
};

const findings = largeEnum.check(ctx);

function findingsFor(toolName: string) {
  return findings.filter((f) => f.toolNames[0] === toolName);
}

describe("large-enum rule", () => {
  it("flags a top-level enum with 21 values", () => {
    const finding = findingsFor("tool_large_enum")[0];
    expect(finding).toEqual({
      ruleId: "large-enum",
      toolNames: ["tool_large_enum"],
      path: ["status"],
      measured: 21,
      threshold: 20,
      tokenCost: 999,
    });
  });

  it("does not flag the 20-value boundary control", () => {
    expect(findingsFor("tool_boundary_enum")).toHaveLength(0);
  });

  it("flags a nested enum inside array items, with the items hop in path", () => {
    const finding = findingsFor("tool_nested_large_enum")[0];
    expect(finding).toEqual({
      ruleId: "large-enum",
      toolNames: ["tool_nested_large_enum"],
      path: ["records", "items", "category"],
      measured: 25,
      threshold: 20,
      tokenCost: 999,
    });
  });

  it("tokenizes the enum array itself, not the whole property schema", () => {
    const finding = findingsFor("tool_large_enum")[0];
    expect(finding?.tokenCost).toBe(999);
  });

  it("does not flag the clean control tool", () => {
    expect(findingsFor("tool_clean")).toHaveLength(0);
  });

  it("produces exactly 2 findings total", () => {
    expect(findings).toHaveLength(2);
  });
});
