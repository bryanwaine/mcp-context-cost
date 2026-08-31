import { describe, expect, it } from "vitest";
import { toolOverlap } from "./rules/tool-overlap.js";
import { clusterOverlaps } from "./cluster-overlaps.js";
import type { ToolDef, RuleContext } from "./types.js";
import filesystemFixture from "../fixtures/real/filesystem.json";
import antvChartFixture from "../fixtures/real/antv-chart.json";

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

// Run: toolOverlap.check() on fixtures/real/filesystem.json produced 3
// findings; clusterOverlaps() on those findings produced:
//   [{ toolNames: [create_directory, list_directory, list_directory_with_sizes],
//      findingCount: 2, similarityRange: { min: 0.6153846153846154, max: 0.6857142857142857 } },
//    { toolNames: [read_file, read_text_file],
//      findingCount: 1, similarityRange: { min: 0.631578947368421, max: 0.631578947368421 } }]
describe("clusterOverlaps against the real filesystem server", () => {
  const tools = filesystemFixture.tools as unknown as ToolDef[];
  const findings = toolOverlap.check(ctxFor(tools));
  const clusters = clusterOverlaps(findings);

  it("produces 2 clusters from 3 tool-overlap findings", () => {
    expect(findings).toHaveLength(3);
    expect(clusters).toHaveLength(2);
  });

  it("chains create_directory / list_directory / list_directory_with_sizes into one cluster", () => {
    expect(clusters[0]?.toolNames).toEqual([
      "create_directory",
      "list_directory",
      "list_directory_with_sizes",
    ]);
    expect(clusters[0]?.findingCount).toBe(2);
    expect(clusters[0]?.similarityRange.min).toBeCloseTo(0.6154, 4);
    expect(clusters[0]?.similarityRange.max).toBeCloseTo(0.6857, 4);
  });

  it("keeps read_file / read_text_file as a separate 2-member cluster", () => {
    expect(clusters[1]?.toolNames).toEqual(["read_file", "read_text_file"]);
    expect(clusters[1]?.findingCount).toBe(1);
    expect(clusters[1]?.similarityRange.min).toBeCloseTo(0.6316, 4);
    expect(clusters[1]?.similarityRange.max).toBeCloseTo(0.6316, 4);
  });

  it("conserves every finding across clusters", () => {
    const summed = clusters.reduce((n, c) => n + c.findingCount, 0);
    expect(summed).toBe(findings.length);
  });
});

// Run: toolOverlap.check() on fixtures/real/antv-chart.json produced 52
// findings; clusterOverlaps() on those findings produced 3 clusters:
//   14-member chart family, findingCount 49, similarityRange
//     { min: 0.6111111111111112, max: 0.7647058823529411 }
//   3-member map family (mind_map, path_map, pin_map), findingCount 2,
//     similarityRange { min: 0.6206896551724138, max: 0.6896551724137931 }
//   2-member diagram pair (fishbone_diagram, flow_diagram), findingCount 1,
//     similarityRange { min: 0.6666666666666666, max: 0.6666666666666666 }
describe("clusterOverlaps against the real antv-chart server", () => {
  const tools = antvChartFixture.tools as unknown as ToolDef[];
  const findings = toolOverlap.check(ctxFor(tools));
  const clusters = clusterOverlaps(findings);

  it("compresses 52 pairwise findings into 3 clusters", () => {
    expect(findings).toHaveLength(52);
    expect(clusters).toHaveLength(3);
  });

  it("groups the 14-member chart family first, by descending size", () => {
    expect(clusters[0]?.toolNames).toEqual([
      "generate_area_chart",
      "generate_bar_chart",
      "generate_boxplot_chart",
      "generate_column_chart",
      "generate_funnel_chart",
      "generate_line_chart",
      "generate_liquid_chart",
      "generate_pie_chart",
      "generate_radar_chart",
      "generate_sankey_chart",
      "generate_scatter_chart",
      "generate_treemap_chart",
      "generate_venn_chart",
      "generate_violin_chart",
    ]);
    expect(clusters[0]?.findingCount).toBe(49);
    expect(clusters[0]?.similarityRange.min).toBeCloseTo(0.6111, 4);
    expect(clusters[0]?.similarityRange.max).toBeCloseTo(0.7647, 4);
  });

  it("groups the 3-member map family second", () => {
    expect(clusters[1]?.toolNames).toEqual([
      "generate_mind_map",
      "generate_path_map",
      "generate_pin_map",
    ]);
    expect(clusters[1]?.findingCount).toBe(2);
    expect(clusters[1]?.similarityRange.min).toBeCloseTo(0.6207, 4);
    expect(clusters[1]?.similarityRange.max).toBeCloseTo(0.6897, 4);
  });

  it("groups the fishbone/flow diagram pair third", () => {
    expect(clusters[2]?.toolNames).toEqual([
      "generate_fishbone_diagram",
      "generate_flow_diagram",
    ]);
    expect(clusters[2]?.findingCount).toBe(1);
    expect(clusters[2]?.similarityRange.min).toBeCloseTo(0.6667, 4);
    expect(clusters[2]?.similarityRange.max).toBeCloseTo(0.6667, 4);
  });

  it("conserves every finding across clusters", () => {
    const summed = clusters.reduce((n, c) => n + c.findingCount, 0);
    expect(summed).toBe(findings.length);
  });

  it("leaves the 8 tools with no tool-overlap finding out of every cluster", () => {
    const clustered = new Set(clusters.flatMap((c) => c.toolNames));
    const unclustered = tools.map((t) => t.name).filter((name) => !clustered.has(name));
    expect(unclustered).toEqual([
      "generate_district_map",
      "generate_dual_axes_chart",
      "generate_histogram_chart",
      "generate_network_graph",
      "generate_organization_chart",
      "generate_waterfall_chart",
      "generate_word_cloud_chart",
      "generate_spreadsheet",
    ]);
  });
});
