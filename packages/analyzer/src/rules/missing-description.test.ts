import { describe, expect, it } from "vitest";
import { missingDescription } from "./missing-description.js";
import { missingDescriptionTools } from "../../fixtures/synthetic/missing-description.js";
import type { RuleContext } from "../types.js";

const ctx: RuleContext = {
  tools: missingDescriptionTools,
  measurements: {
    perTool: [],
    serverTotalTokens: 0,
    averageTokensPerTool: 0,
    contextWindowTokens: 200_000,
  },
  countTokens: () => 0,
};

const findings = missingDescription.check(ctx);

function findingsFor(toolName: string) {
  return findings.filter((f) => f.toolNames[0] === toolName);
}

describe("missing-description rule", () => {
  it("flags a tool with no description", () => {
    const toolLevel = findingsFor("tool_missing_description").find((f) => f.path === undefined);
    expect(toolLevel).toEqual({
      ruleId: "missing-description",
      toolNames: ["tool_missing_description"],
    });
  });

  it("does not also flag that tool's fully-described parameter", () => {
    expect(findingsFor("tool_missing_description")).toHaveLength(1);
  });

  it("flags a parameter with an entirely absent description key", () => {
    const finding = findingsFor("tool_missing_param_description").find(
      (f) => f.path?.[0] === "id",
    );
    expect(finding).toEqual({
      ruleId: "missing-description",
      toolNames: ["tool_missing_param_description"],
      path: ["id"],
    });
  });

  it("flags a parameter with an empty-string description", () => {
    const finding = findingsFor("tool_missing_param_description").find(
      (f) => f.path?.[0] === "label",
    );
    expect(finding).toEqual({
      ruleId: "missing-description",
      toolNames: ["tool_missing_param_description"],
      path: ["label"],
    });
  });

  it("flags a parameter with a whitespace-only description", () => {
    const finding = findingsFor("tool_missing_param_description").find(
      (f) => f.path?.[0] === "note",
    );
    expect(finding).toEqual({
      ruleId: "missing-description",
      toolNames: ["tool_missing_param_description"],
      path: ["note"],
    });
  });

  it("does not flag that tool at the tool level, since it has its own description", () => {
    expect(findingsFor("tool_missing_param_description")).toHaveLength(3);
  });

  it("flags a nested object property missing a description", () => {
    const finding = findingsFor("tool_nested_missing_description").find(
      (f) => f.path?.join(".") === "options.retries",
    );
    expect(finding).toEqual({
      ruleId: "missing-description",
      toolNames: ["tool_nested_missing_description"],
      path: ["options", "retries"],
    });
  });

  it("flags a property inside array items missing a description", () => {
    const finding = findingsFor("tool_nested_missing_description").find(
      (f) => f.path?.join(".") === "files.items.path",
    );
    expect(finding).toEqual({
      ruleId: "missing-description",
      toolNames: ["tool_nested_missing_description"],
      path: ["files", "items", "path"],
    });
  });

  it("does not flag the fully-described clean control tool", () => {
    expect(findingsFor("tool_clean")).toHaveLength(0);
  });

  it("omits measured and threshold on every parameter finding", () => {
    const paramFindings = findings.filter((f) => f.path !== undefined);
    expect(paramFindings.length).toBeGreaterThan(0);
    for (const finding of paramFindings) {
      expect(finding.measured).toBeUndefined();
      expect(finding.threshold).toBeUndefined();
    }
  });

  it("omits path, measured, and threshold on the whole-tool finding", () => {
    const toolLevel = findingsFor("tool_missing_description").find((f) => f.path === undefined);
    expect(toolLevel?.path).toBeUndefined();
    expect(toolLevel?.measured).toBeUndefined();
    expect(toolLevel?.threshold).toBeUndefined();
  });

  it("produces exactly 6 findings total", () => {
    expect(findings).toHaveLength(6);
  });
});
