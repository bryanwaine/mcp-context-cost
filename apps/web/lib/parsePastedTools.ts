import type { ToolDef } from "@mcp-context-cost/analyzer";

export type ParseFailureStage = "json" | "shape" | "tools";

export interface ParseFailure {
  ok: false;
  stage: ParseFailureStage;
  message: string;
  details?: string[];
}

export interface ParseSuccess {
  ok: true;
  tools: ToolDef[];
}

export type ParseResult = ParseSuccess | ParseFailure;

const MAX_REPORTED_ERRORS = 10;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Three accepted shapes, collapsed to two structural checks: {"tools":[...]}
// covers both scripts/capture.ts's raw ListToolsResult and a hand-copied
// "tools" field, and {"result":{"tools":[...]}} covers the JSON-RPC envelope
// the MCP Inspector CLI's --format json actually emits.
function extractToolsArray(parsed: unknown): unknown[] | null {
  if (Array.isArray(parsed)) return parsed;
  if (isRecord(parsed)) {
    if (Array.isArray(parsed.tools)) return parsed.tools;
    if (isRecord(parsed.result) && Array.isArray(parsed.result.tools)) {
      return parsed.result.tools;
    }
  }
  return null;
}

function describeTopLevel(parsed: unknown): string {
  if (Array.isArray(parsed)) return "an array";
  if (isRecord(parsed)) {
    const keys = Object.keys(parsed);
    return keys.length === 0
      ? "an empty object"
      : `an object with keys: ${keys.join(", ")}`;
  }
  return `a JSON ${typeof parsed}`;
}

// Minimal ToolDef validation — just enough that analyze() won't throw.
// walkSchema reads schema.properties unconditionally, so a tool with no
// inputSchema at all crashes deep inside the analyzer rather than failing
// here with a message that names the actual problem.
function validateTool(candidate: unknown, index: number): string | null {
  if (!isRecord(candidate)) return `tool ${index}: not an object`;

  if (typeof candidate.name !== "string" || candidate.name.length === 0) {
    return `tool ${index}: missing "name"`;
  }
  const label = `"${candidate.name}"`;

  if (!isRecord(candidate.inputSchema)) {
    return `tool ${label}: missing "inputSchema"`;
  }
  if (
    candidate.inputSchema.type !== undefined &&
    candidate.inputSchema.type !== "object"
  ) {
    return `tool ${label}: inputSchema.type is ${JSON.stringify(candidate.inputSchema.type)}, expected "object"`;
  }

  return null;
}

export function parsePastedTools(raw: string): ParseResult {
  if (raw.trim() === "") {
    return {
      ok: false,
      stage: "json",
      message: "Paste a tools/list response first.",
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      stage: "json",
      message: `This isn't valid JSON (${detail}). Paste the exact output of the command above, including surrounding brackets and quotes.`,
    };
  }

  const toolsArray = extractToolsArray(parsed);
  if (toolsArray === null) {
    return {
      ok: false,
      stage: "shape",
      message: `Recognized JSON, but not a tools/list response. Expected a bare array of tools, {"tools": [...]}, or a JSON-RPC envelope with {"result": {"tools": [...]}}. Got ${describeTopLevel(parsed)}.`,
    };
  }

  const errors: string[] = [];
  toolsArray.forEach((candidate, index) => {
    const error = validateTool(candidate, index);
    if (error) errors.push(error);
  });

  if (errors.length > 0) {
    return {
      ok: false,
      stage: "tools",
      message: `${errors.length} of ${toolsArray.length} tools are missing required fields. Every tool needs a "name" and an "inputSchema" with type "object", exactly as the server returned it. Nothing is analysed until every tool parses, since a partial count would misreport the total.`,
      details: errors.slice(0, MAX_REPORTED_ERRORS),
    };
  }

  return { ok: true, tools: toolsArray as ToolDef[] };
}
