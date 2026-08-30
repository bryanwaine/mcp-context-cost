import { describe, expect, it } from "vitest";
import { toolOverlap } from "./tool-overlap.js";
import type { ToolDef, RuleContext } from "../types.js";
import fixture from "../../fixtures/real/filesystem.json";

const tools = fixture.tools as unknown as ToolDef[];

const ctx: RuleContext = {
  tools,
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

describe("tool-overlap against the real filesystem server", () => {
  it("pins the total finding count for this fixture", () => {
    expect(findings).toHaveLength(3);
  });

  it("flags read_file / read_text_file as overlapping", () => {
    expect(findingFor("read_file", "read_text_file")).toBeDefined();
  });

  it("does not flag read_file / move_file as overlapping", () => {
    expect(findingFor("read_file", "move_file")).toBeUndefined();
  });

  // Known false positive: opposite operations that happen to share the
  // "_directory" suffix. Pinned deliberately so a future change to the
  // metric surfaces here rather than silently.
  it("flags create_directory / list_directory as overlapping (known false positive)", () => {
    expect(findingFor("create_directory", "list_directory")).toBeDefined();
  });

  // Known false negative: the same operation under a different name, scoring
  // 0.583 — below the 0.6 threshold. Name-only trigram similarity has no way
  // to catch this; not a bug to fix, just a structural limit of the metric.
  it("does not flag list_directory / directory_tree as overlapping (known false negative)", () => {
    expect(findingFor("list_directory", "directory_tree")).toBeUndefined();
  });
});
