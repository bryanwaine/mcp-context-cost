import { describe, expect, it } from "vitest";
import { toolOverlap } from "./tool-overlap.js";
import { toolOverlapTools } from "../../fixtures/synthetic/tool-overlap.js";
import type { RuleContext } from "../types.js";

const ctx: RuleContext = {
  tools: toolOverlapTools,
  measurements: {
    perTool: [],
    serverTotalTokens: 0,
    averageTokensPerTool: 0,
    contextWindowTokens: 200_000,
  },
  countTokens: () => 0,
};

const findings = toolOverlap.check(ctx);

function findingFor(a: string, b: string) {
  const [x, y] = [a, b].sort();
  return findings.find((f) => f.toolNames[0] === x && f.toolNames[1] === y);
}

describe("tool-overlap rule", () => {
  it("flags a near-duplicate pair", () => {
    const finding = findingFor("delete_item", "delete_items");
    expect(finding?.ruleId).toBe("tool-overlap");
    expect(finding?.threshold).toBe(0.6);
    expect(finding?.measured).toBeGreaterThan(0.6);
  });

  it("sorts toolNames alphabetically even when the array order is reversed", () => {
    // update_records appears before update_record in the fixture array.
    const finding = findingFor("update_record", "update_records");
    expect(finding?.toolNames).toEqual(["update_record", "update_records"]);
    expect(finding?.measured).toBeGreaterThan(0.6);
  });

  it("does not flag the clean-control tool against anything", () => {
    expect(findings.filter((f) => f.toolNames.includes("list_folders"))).toHaveLength(0);
  });

  it("does not flag the two positive pairs against each other", () => {
    expect(findingFor("delete_item", "update_record")).toBeUndefined();
    expect(findingFor("delete_item", "update_records")).toBeUndefined();
    expect(findingFor("delete_items", "update_record")).toBeUndefined();
    expect(findingFor("delete_items", "update_records")).toBeUndefined();
  });

  it("does not flag a near-miss pair scoring below the threshold", () => {
    const finding = findingFor("fetch_order", "fetch_user");
    expect(finding).toBeUndefined();
  });

  it("omits path on every finding, since a pair is not a schema node", () => {
    for (const finding of findings) expect(finding.path).toBeUndefined();
  });

  it("produces exactly 2 findings, out of 21 possible pairs among 7 tools", () => {
    expect(findings).toHaveLength(2);
  });
});
