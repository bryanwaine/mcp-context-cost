import { describe, expect, it } from "vitest";
import { missingDescription } from "./rules/missing-description.js";
import { describeCoverage } from "./describe-coverage.js";
import type { ToolDef, RuleContext } from "./types.js";
import filesystemFixture from "../fixtures/real/filesystem.json";
import firecrawlFixture from "../fixtures/real/firecrawl.json";
import mongodbFixture from "../fixtures/real/mongodb.json";

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

function totalMissesIn(summary: ReturnType<typeof describeCoverage>): number {
  return summary.perTool.reduce((n, t) => n + (t.hasDescription ? 0 : 1) + t.parametersMissing, 0);
}

// Run: missingDescription.check() on fixtures/real/filesystem.json produced
// 18 findings; describeCoverage() on those findings + the 14 tools produced:
//   tools: { withDescription: 14, total: 14 }
//   parameters: { withDescription: 9, total: 27 }
//   perTool (12 entries, worst first): search_files (3/3), directory_tree
//   (2/2), edit_file (2/5), move_file (2/2), write_file (2/2),
//   create_directory (1/1), get_file_info (1/1), list_directory (1/1),
//   list_directory_with_sizes (1/2), read_file (1/3), read_media_file (1/1),
//   read_text_file (1/3) — all hasDescription: true.
describe("describeCoverage against the real filesystem server", () => {
  const tools = filesystemFixture.tools as unknown as ToolDef[];
  const findings = missingDescription.check(ctxFor(tools));
  const summary = describeCoverage(findings, tools);

  it("every tool has a description; parameters are 9 of 27 described", () => {
    expect(findings).toHaveLength(18);
    expect(summary.tools).toEqual({ withDescription: 14, total: 14 });
    expect(summary.parameters).toEqual({ withDescription: 9, total: 27 });
  });

  it("orders all 12 affected tools worst-first", () => {
    expect(summary.perTool).toEqual([
      { toolName: "search_files", hasDescription: true, parametersMissing: 3, parametersTotal: 3 },
      { toolName: "directory_tree", hasDescription: true, parametersMissing: 2, parametersTotal: 2 },
      { toolName: "edit_file", hasDescription: true, parametersMissing: 2, parametersTotal: 5 },
      { toolName: "move_file", hasDescription: true, parametersMissing: 2, parametersTotal: 2 },
      { toolName: "write_file", hasDescription: true, parametersMissing: 2, parametersTotal: 2 },
      { toolName: "create_directory", hasDescription: true, parametersMissing: 1, parametersTotal: 1 },
      { toolName: "get_file_info", hasDescription: true, parametersMissing: 1, parametersTotal: 1 },
      { toolName: "list_directory", hasDescription: true, parametersMissing: 1, parametersTotal: 1 },
      { toolName: "list_directory_with_sizes", hasDescription: true, parametersMissing: 1, parametersTotal: 2 },
      { toolName: "read_file", hasDescription: true, parametersMissing: 1, parametersTotal: 3 },
      { toolName: "read_media_file", hasDescription: true, parametersMissing: 1, parametersTotal: 1 },
      { toolName: "read_text_file", hasDescription: true, parametersMissing: 1, parametersTotal: 3 },
    ]);
  });

  it("conserves every finding across perTool", () => {
    expect(totalMissesIn(summary)).toBe(findings.length);
  });
});

// Run: missingDescription.check() on fixtures/real/firecrawl.json produced
// 287 findings; describeCoverage() on those findings + the 25 tools produced:
//   tools: { withDescription: 25, total: 25 }
//   parameters: { withDescription: 18, total: 305 }
//   perTool: 22 affected tools, worst first: firecrawl_crawl (61/61),
//   firecrawl_search (55/57), firecrawl_interact (51/51), firecrawl_scrape
//   (45/45), firecrawl_parse (19/22), firecrawl_monitor_create (15/15).
describe("describeCoverage against the real firecrawl server", () => {
  const tools = firecrawlFixture.tools as unknown as ToolDef[];
  const findings = missingDescription.check(ctxFor(tools));
  const summary = describeCoverage(findings, tools);

  it("every tool has a description; parameters are 18 of 305 described", () => {
    expect(findings).toHaveLength(287);
    expect(summary.tools).toEqual({ withDescription: 25, total: 25 });
    expect(summary.parameters).toEqual({ withDescription: 18, total: 305 });
  });

  it("orders the six worst-documented tools first, of 22 affected", () => {
    expect(summary.perTool).toHaveLength(22);
    expect(summary.perTool.slice(0, 6)).toEqual([
      { toolName: "firecrawl_crawl", hasDescription: true, parametersMissing: 61, parametersTotal: 61 },
      { toolName: "firecrawl_search", hasDescription: true, parametersMissing: 55, parametersTotal: 57 },
      { toolName: "firecrawl_interact", hasDescription: true, parametersMissing: 51, parametersTotal: 51 },
      { toolName: "firecrawl_scrape", hasDescription: true, parametersMissing: 45, parametersTotal: 45 },
      { toolName: "firecrawl_parse", hasDescription: true, parametersMissing: 19, parametersTotal: 22 },
      { toolName: "firecrawl_monitor_create", hasDescription: true, parametersMissing: 15, parametersTotal: 15 },
    ]);
  });

  it("conserves every finding across perTool", () => {
    expect(totalMissesIn(summary)).toBe(findings.length);
  });
});

// Run: missingDescription.check() on fixtures/real/mongodb.json produced 96
// findings; describeCoverage() on those findings + the 27 tools produced:
//   tools: { withDescription: 27, total: 27 }
//   parameters: { withDescription: 0, total: 96 }  -- every parameter across
//   every tool is undocumented.
//   perTool: 25 affected tools, worst first: find (8/8), export (6/6),
//   update-many (6/6), aggregate (5/5), collection-schema (5/5),
//   create-index (5/5).
describe("describeCoverage against the real mongodb server", () => {
  const tools = mongodbFixture.tools as unknown as ToolDef[];
  const findings = missingDescription.check(ctxFor(tools));
  const summary = describeCoverage(findings, tools);

  it("every tool has a description, but zero of 96 parameters do", () => {
    expect(findings).toHaveLength(96);
    expect(summary.tools).toEqual({ withDescription: 27, total: 27 });
    expect(summary.parameters).toEqual({ withDescription: 0, total: 96 });
  });

  it("puts the tools with the most parameters first", () => {
    expect(summary.perTool).toHaveLength(25);
    expect(summary.perTool.slice(0, 6)).toEqual([
      { toolName: "find", hasDescription: true, parametersMissing: 8, parametersTotal: 8 },
      { toolName: "export", hasDescription: true, parametersMissing: 6, parametersTotal: 6 },
      { toolName: "update-many", hasDescription: true, parametersMissing: 6, parametersTotal: 6 },
      { toolName: "aggregate", hasDescription: true, parametersMissing: 5, parametersTotal: 5 },
      { toolName: "collection-schema", hasDescription: true, parametersMissing: 5, parametersTotal: 5 },
      { toolName: "create-index", hasDescription: true, parametersMissing: 5, parametersTotal: 5 },
    ]);
  });

  it("conserves every finding across perTool", () => {
    expect(totalMissesIn(summary)).toBe(findings.length);
  });
});
