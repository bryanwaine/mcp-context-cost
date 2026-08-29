// ---- Tool definition (mirrors the MCP SDK's Tool shape structurally) ----

export interface JsonSchema {
  type?: string;
  description?: string;
  enum?: unknown[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema | JsonSchema[];
  required?: string[];
  [key: string]: unknown;
}

export interface ObjectSchema extends JsonSchema {
  type: "object";
}

export interface ToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

export interface ToolIcon {
  src: string;
  mimeType?: string;
  sizes?: string[];
  theme?: "light" | "dark";
}

export interface ToolDef {
  name: string;
  title?: string;
  description?: string;
  inputSchema: ObjectSchema;
  outputSchema?: ObjectSchema;
  annotations?: ToolAnnotations;
  execution?: { taskSupport?: "optional" | "required" | "forbidden" };
  icons?: ToolIcon[];
  _meta?: Record<string, unknown>;
}

// ---- Pass 1: measurement (facts, never findings) ----

export interface TokenizerInfo {
  id: "o200k_base";
  approximate: true;
}

export interface ToolMeasurement {
  toolName: string;
  tokens: number;
}

export interface Measurements {
  perTool: ToolMeasurement[];
  serverTotalTokens: number;
  averageTokensPerTool: number;
  contextWindowTokens: number;
}

// ---- Pass 2: rules (problems only) ----

export type RuleId =
  | "missing-description"
  | "description-restates-name"
  | "large-enum"
  | "deep-nesting"
  | "tool-overlap";

export type RuleScope = "tool" | "server";

// Property-key chain from inputSchema root to the flagged node.
// Omitted for whole-tool findings and for tool-overlap (a pair, not a node).
export type SchemaPath = string[];

export interface Finding {
  ruleId: RuleId;
  toolNames: string[]; // length 1 for every rule except tool-overlap, length 2 for tool-overlap
  path?: SchemaPath;
  // Threshold rules (large-enum, deep-nesting, description-restates-name,
  // tool-overlap) populate measured/threshold: the value that crossed the
  // line, and the line it crossed, same unit. missing-description is about
  // absence, not a threshold crossing, and omits both.
  measured?: number;
  threshold?: number;
  // Tokens attributable to the flagged element, when the rule can attribute
  // one (e.g. "42 enum values costing 340 tokens"). Computed by the rule via
  // the injected countTokens, not derived from the fixed measurement facts.
  tokenCost?: number;
}

export interface Report {
  tokenizer: TokenizerInfo;
  measurements: Measurements;
  findings: Finding[];
}

// ---- Rule registry ----

export interface RuleContext {
  tools: readonly ToolDef[];
  measurements: Measurements;
  countTokens: (value: unknown) => number;
}

export interface Rule {
  id: RuleId;
  scope: RuleScope;
  check: (ctx: RuleContext) => Finding[];
}
