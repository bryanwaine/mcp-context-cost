import { describe, expect, it } from "vitest";
import { measure } from "./measure.js";
import type { ToolDef } from "./types.js";
import fixture from "../fixtures/real/filesystem.json";

// JSON module inference widens string literals, so ToolDef's literal-union
// fields (inputSchema.type: "object", execution.taskSupport) cannot be
// checked by annotation — the cast is required. Conformance is enforced by
// the 2795 assertion instead: any drift in the captured shape changes the
// token count.
const tools = fixture.tools as unknown as ToolDef[];

describe("measure", () => {
  it("counts every tool in the filesystem fixture", () => {
    expect(tools.length).toBe(14);
  });

  it("measures serverTotalTokens in a single pass over the full array", () => {
    expect(measure(tools).serverTotalTokens).toBe(2795);
  });

  it("differs from the sum of perTool tokens, because join boundaries tokenize differently in isolation", () => {
    const { perTool, serverTotalTokens } = measure(tools);
    const summed = perTool.reduce((sum, t) => sum + t.tokens, 0);

    expect(summed).toBe(2793);
    expect(summed).not.toBe(serverTotalTokens);
  });

  it("averages tokensPerTool from the perTool sum", () => {
    expect(measure(tools).averageTokensPerTool).toBe(199.5);
  });
});
