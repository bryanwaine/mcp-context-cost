import { describe, expect, it } from "vitest";
import { parsePastedTools } from "./parsePastedTools";

const TOOL = {
  name: "create_issue",
  description: "Create a new issue",
  inputSchema: { type: "object", properties: {} },
};

describe("parsePastedTools — accepted shapes", () => {
  it("accepts a bare array", () => {
    const result = parsePastedTools(JSON.stringify([TOOL]));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.tools).toEqual([TOOL]);
  });

  it("accepts {tools: [...]} (scripts/capture.ts's shape)", () => {
    const result = parsePastedTools(JSON.stringify({ tools: [TOOL] }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.tools).toEqual([TOOL]);
  });

  it("accepts a JSON-RPC envelope with result.tools", () => {
    const result = parsePastedTools(
      JSON.stringify({ jsonrpc: "2.0", id: 1, result: { tools: [TOOL] } }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.tools).toEqual([TOOL]);
  });

  it("accepts an empty tools array", () => {
    const result = parsePastedTools(JSON.stringify({ tools: [] }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.tools).toEqual([]);
  });
});

describe("parsePastedTools — failure stages", () => {
  it("flags invalid JSON", () => {
    const result = parsePastedTools("{not json");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe("json");
      expect(result.message).toMatch(/isn't valid JSON/);
    }
  });

  it("flags empty input as invalid JSON stage", () => {
    const result = parsePastedTools("   ");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.stage).toBe("json");
  });

  it("flags valid JSON of an unrecognised shape", () => {
    const result = parsePastedTools(JSON.stringify({ foo: "bar" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe("shape");
      expect(result.message).toMatch(/keys: foo/);
    }
  });

  it("flags a top-level string as an unrecognised shape", () => {
    const result = parsePastedTools(JSON.stringify("hello"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.stage).toBe("shape");
  });

  it("flags a tool missing a name", () => {
    const result = parsePastedTools(
      JSON.stringify({ tools: [{ inputSchema: { type: "object" } }] }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe("tools");
      expect(result.details?.[0]).toMatch(/missing "name"/);
    }
  });

  it("flags a tool missing an inputSchema", () => {
    const result = parsePastedTools(JSON.stringify({ tools: [{ name: "x" }] }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe("tools");
      expect(result.details?.[0]).toMatch(/missing "inputSchema"/);
    }
  });

  it("flags a tool whose inputSchema.type is not object", () => {
    const result = parsePastedTools(
      JSON.stringify({
        tools: [{ name: "x", inputSchema: { type: "string" } }],
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe("tools");
      expect(result.details?.[0]).toMatch(/expected "object"/);
    }
  });

  it("flags a tool that isn't an object", () => {
    const result = parsePastedTools(JSON.stringify({ tools: ["hello"] }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe("tools");
      expect(result.details?.[0]).toMatch(/tool 0: not an object/);
    }
  });

  it("caps reported errors at 10 but counts all of them in the message", () => {
    const bad = Array.from({ length: 15 }, () => ({
      inputSchema: { type: "object" },
    }));
    const result = parsePastedTools(JSON.stringify({ tools: bad }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.details).toHaveLength(10);
      expect(result.message).toMatch(/15 of 15 tools/);
    }
  });
});
