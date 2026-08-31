import { describe, expect, it } from "vitest";
import { describeCoverage } from "./describe-coverage.js";
import { missingDescription } from "./rules/missing-description.js";
import { missingDescriptionTools } from "../fixtures/synthetic/missing-description.js";
import type { Finding, RuleContext, ToolDef } from "./types.js";

function ctxFor(tools: ToolDef[]): RuleContext {
  return {
    tools,
    measurements: {
      perTool: [],
      serverTotalTokens: 0,
      averageTokensPerTool: 0,
      contextWindowTokens: 200_000,
    },
    countTokens: () => 0,
  };
}

describe("describeCoverage", () => {
  describe("against the missing-description synthetic fixture", () => {
    // tool_missing_description: no tool description, 1/1 params described.
    // tool_missing_param_description: has a description, 0/3 params described.
    // tool_nested_missing_description: has a description, 2/4 params described.
    // tool_clean: has a description, 4/4 params described.
    const findings = missingDescription.check(ctxFor(missingDescriptionTools));
    const summary = describeCoverage(findings, missingDescriptionTools);

    it("counts tool-level coverage across all 4 tools, including the clean control", () => {
      expect(summary.tools).toEqual({ withDescription: 3, total: 4 });
    });

    it("counts parameter-level coverage across all describable nodes", () => {
      expect(summary.parameters).toEqual({ withDescription: 7, total: 12 });
    });

    it("omits the fully-described clean control from perTool", () => {
      expect(summary.perTool.find((t) => t.toolName === "tool_clean")).toBeUndefined();
    });

    it("orders perTool worst-first: parameter miss count beats a bare tool-level miss", () => {
      expect(summary.perTool.map((t) => t.toolName)).toEqual([
        "tool_missing_param_description",
        "tool_nested_missing_description",
        "tool_missing_description",
      ]);
    });

    it("reports each tool's own parameter total, not the server-wide total", () => {
      expect(summary.perTool).toEqual([
        {
          toolName: "tool_missing_param_description",
          hasDescription: true,
          parametersMissing: 3,
          parametersTotal: 3,
        },
        {
          toolName: "tool_nested_missing_description",
          hasDescription: true,
          parametersMissing: 2,
          parametersTotal: 4,
        },
        {
          toolName: "tool_missing_description",
          hasDescription: false,
          parametersMissing: 0,
          parametersTotal: 1,
        },
      ]);
    });
  });

  it("breaks a tie in badness alphabetically, regardless of input order", () => {
    // Both tools miss exactly one of two params: equal badness, so the
    // alphabetical tiebreak must decide the order, not fixture order.
    const tools: ToolDef[] = [
      {
        name: "z_tool",
        description: "Z tool.",
        inputSchema: {
          type: "object",
          properties: {
            a: { type: "string", description: "Described." },
            b: { type: "string" },
          },
        },
      },
      {
        name: "a_tool",
        description: "A tool.",
        inputSchema: {
          type: "object",
          properties: {
            a: { type: "string", description: "Described." },
            b: { type: "string" },
          },
        },
      },
    ];
    const findings = missingDescription.check(ctxFor(tools));

    const summary = describeCoverage(findings, tools);

    expect(summary.perTool.map((t) => t.toolName)).toEqual(["a_tool", "z_tool"]);
  });

  it("ignores findings from other rules", () => {
    const tools: ToolDef[] = [
      {
        name: "solo_tool",
        inputSchema: { type: "object", properties: {} },
      },
    ];
    const findings: Finding[] = [
      { ruleId: "missing-description", toolNames: ["solo_tool"] },
      { ruleId: "tool-overlap", toolNames: ["solo_tool", "other_tool"], measured: 0.7, threshold: 0.6 },
    ];

    const summary = describeCoverage(findings, tools);

    expect(summary.tools).toEqual({ withDescription: 0, total: 1 });
    expect(summary.perTool).toHaveLength(1);
  });

  it("reports full coverage, not an empty summary, when there are no findings", () => {
    const tools: ToolDef[] = [
      {
        name: "fully_described",
        description: "Everything about this tool is documented.",
        inputSchema: {
          type: "object",
          properties: { id: { type: "string", description: "The id." } },
        },
      },
    ];

    const summary = describeCoverage([], tools);

    expect(summary.tools).toEqual({ withDescription: 1, total: 1 });
    expect(summary.parameters).toEqual({ withDescription: 1, total: 1 });
    expect(summary.perTool).toEqual([]);
  });
});
