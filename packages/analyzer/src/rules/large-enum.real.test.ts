import { describe, expect, it } from "vitest";
import { largeEnum } from "./large-enum.js";
import type { ToolDef, RuleContext } from "../types.js";
import context7 from "../../fixtures/real/context7.json";
import playwright from "../../fixtures/real/playwright.json";
import filesystem from "../../fixtures/real/filesystem.json";

function check(tools: ToolDef[]) {
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
  return largeEnum.check(ctx);
}

// Known limitation, pinned deliberately: none of the three captured
// fixtures crosses the 20-value threshold today. Full measured distribution
// (largest first): browser_fill_form.fields.items.type (playwright) = 5,
// browser_console_messages.level (playwright) = 4,
// browser_network_request.part (playwright) = 4, browser_tabs.action
// (playwright) = 4, browser_click.button (playwright) = 3,
// browser_take_screenshot.type (playwright) = 3,
// browser_take_screenshot.scale (playwright) = 2,
// list_directory_with_sizes.sortBy (filesystem) = 2. context7.json has no
// enums at all. 
// The threshold itself is provisional: 20 is four times the largest enum
// observed, and was chosen before any of this data existed. It has never
// been calibrated against a real server, unlike tool-overlap's 0.6, which
// was checked against a known-overlapping pair.
// So a future captured fixture that does cross 20 should
// surface here as a deliberate, visible count change, not a silent gap.
describe("large-enum against real captured servers", () => {
  it("finds nothing in context7.json", () => {
    expect(check(context7.tools as unknown as ToolDef[])).toHaveLength(0);
  });

  it("finds nothing in playwright.json", () => {
    expect(check(playwright.tools as unknown as ToolDef[])).toHaveLength(0);
  });

  it("finds nothing in filesystem.json", () => {
    expect(check(filesystem.tools as unknown as ToolDef[])).toHaveLength(0);
  });
});
