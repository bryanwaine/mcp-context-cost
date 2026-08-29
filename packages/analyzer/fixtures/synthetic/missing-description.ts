import type { ToolDef } from "../../src/types.js";

// Tool-level absence, isolated: this tool's one parameter is fully described.
const toolMissingDescription: ToolDef = {
  name: "tool_missing_description",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Path to the file." },
    },
    required: ["path"],
  },
};

// Parameter-level absence, all three variants that must count as "missing":
// entirely absent key, empty string, whitespace-only. Isolated from the
// tool-level case — this tool has its own description.
const toolMissingParamDescription: ToolDef = {
  name: "tool_missing_param_description",
  description: "Does something with three parameters.",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string" },
      label: { type: "string", description: "" },
      note: { type: "string", description: "\n\t  " },
    },
    required: ["id"],
  },
};

// Recursion: a nested object property and an array's item schema, each
// missing a description at the deeper level.
const toolNestedMissingDescription: ToolDef = {
  name: "tool_nested_missing_description",
  description: "Does something with nested and array parameters.",
  inputSchema: {
    type: "object",
    properties: {
      options: {
        type: "object",
        description: "Tuning options.",
        properties: {
          retries: { type: "number" },
        },
      },
      files: {
        type: "array",
        description: "Files to process.",
        items: {
          type: "object",
          properties: {
            path: { type: "string" },
          },
        },
      },
    },
    required: [],
  },
};

// Clean control: every description present at every level, including nested
// object and array-items properties. Zero findings expected.
const toolClean: ToolDef = {
  name: "tool_clean",
  description: "A fully documented tool.",
  inputSchema: {
    type: "object",
    properties: {
      options: {
        type: "object",
        description: "Tuning options.",
        properties: {
          retries: { type: "number", description: "Number of retries." },
        },
      },
      files: {
        type: "array",
        description: "Files to process.",
        items: {
          type: "object",
          properties: {
            path: { type: "string", description: "Path to the file." },
          },
        },
      },
    },
    required: [],
  },
};

export const missingDescriptionTools: ToolDef[] = [
  toolMissingDescription,
  toolMissingParamDescription,
  toolNestedMissingDescription,
  toolClean,
];
