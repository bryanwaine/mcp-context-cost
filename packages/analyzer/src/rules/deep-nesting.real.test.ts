import { describe, expect, it } from "vitest";
import { deepNesting } from "./deep-nesting.js";
import type { ToolDef, RuleContext } from "../types.js";
import antvChart from "../../fixtures/real/antv-chart.json";
import chromeDevtools from "../../fixtures/real/chrome-devtools.json";
import context7 from "../../fixtures/real/context7.json";
import discourse from "../../fixtures/real/discourse.json";
import filesystem from "../../fixtures/real/filesystem.json";
import firecrawl from "../../fixtures/real/firecrawl.json";
import goreleaser from "../../fixtures/real/goreleaser.json";
import mapboxDocs from "../../fixtures/real/mapbox-docs.json";
import mongodb from "../../fixtures/real/mongodb.json";
import nextDevtools from "../../fixtures/real/next-devtools.json";
import playwright from "../../fixtures/real/playwright.json";
import questdb from "../../fixtures/real/questdb.json";

function check(fixture: { tools: unknown }) {
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
  return deepNesting.check(ctx);
}

// Pinned per-server, not just as a total, so a change that moves findings
// between servers (rather than changing the count) fails here instead of
// netting out. These counts, tool names, and depths were confirmed by
// running the rule directly against all twelve fixtures before writing any
// assertion:
//
// antv-chart.json: 5 finding(s)
//   - generate_district_map depth=4 path=data.subdistricts.items.style.fillColor
//   - generate_fishbone_diagram depth=5 path=data.children.items.children.items.children.items.name
//   - generate_mind_map depth=5 path=data.children.items.children.items.children.items.name
//   - generate_organization_chart depth=5 path=data.children.items.children.items.children.items.name
//   - generate_treemap_chart depth=4 path=data.items.children.items.children.items.name
// firecrawl.json: 3 finding(s)
//   - firecrawl_search / firecrawl_crawl / firecrawl_interact, all depth=4
//     path=scrapeOptions.screenshotOptions.viewport.width
// questdb.json: 1 finding(s)
//   - apply_notebook_state depth=5 path=cells.items.chart_config.queries.items.ohlc.open
// all other nine fixtures: 0 finding(s) each
describe("deep-nesting against the twelve real captured servers", () => {
  it("flags exactly the 5 antv-chart tools past the depth threshold", () => {
    const findings = check(antvChart);
    expect(findings).toHaveLength(5);
    expect(findings.map((f) => f.toolNames[0]).sort()).toEqual([
      "generate_district_map",
      "generate_fishbone_diagram",
      "generate_mind_map",
      "generate_organization_chart",
      "generate_treemap_chart",
    ]);
  });

  it("finds 3 in firecrawl.json", () => {
    expect(check(firecrawl)).toHaveLength(3);
  });

  it("flags apply_notebook_state in questdb.json at depth 5", () => {
    const findings = check(questdb);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.toolNames).toEqual(["apply_notebook_state"]);
    expect(findings[0]?.measured).toBe(5);
  });

  it("finds nothing in chrome-devtools.json", () => {
    expect(check(chromeDevtools)).toHaveLength(0);
  });

  it("finds nothing in context7.json", () => {
    expect(check(context7)).toHaveLength(0);
  });

  it("finds nothing in discourse.json", () => {
    expect(check(discourse)).toHaveLength(0);
  });

  it("finds nothing in filesystem.json", () => {
    expect(check(filesystem)).toHaveLength(0);
  });

  it("finds nothing in goreleaser.json", () => {
    expect(check(goreleaser)).toHaveLength(0);
  });

  it("finds nothing in mapbox-docs.json", () => {
    expect(check(mapboxDocs)).toHaveLength(0);
  });

  it("finds nothing in mongodb.json", () => {
    expect(check(mongodb)).toHaveLength(0);
  });

  it("finds nothing in next-devtools.json", () => {
    expect(check(nextDevtools)).toHaveLength(0);
  });

  it("finds nothing in playwright.json", () => {
    expect(check(playwright)).toHaveLength(0);
  });

  it("finds exactly 9 findings across all twelve servers combined", () => {
    const total =
      check(antvChart).length +
      check(chromeDevtools).length +
      check(context7).length +
      check(discourse).length +
      check(filesystem).length +
      check(firecrawl).length +
      check(goreleaser).length +
      check(mapboxDocs).length +
      check(mongodb).length +
      check(nextDevtools).length +
      check(playwright).length +
      check(questdb).length;
    expect(total).toBe(9);
  });
});
