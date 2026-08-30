import type { ToolDef } from "../../src/types.js";

function values(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `value_${i}`);
}

// Positive case, top-level property: 21 values, one over the 20-value
// threshold.
const toolLargeEnum: ToolDef = {
  name: "tool_large_enum",
  description: "Does something with a status parameter.",
  inputSchema: {
    type: "object",
    properties: {
      status: { type: "string", description: "The status.", enum: values(21) },
    },
    required: ["status"],
  },
};

// Boundary control, exactly at the threshold: 20 values must not be flagged,
// since the rule fires on "more than 20", not "20 or more".
const toolBoundaryEnum: ToolDef = {
  name: "tool_boundary_enum",
  description: "Does something with a boundary parameter.",
  inputSchema: {
    type: "object",
    properties: {
      status: { type: "string", description: "The status.", enum: values(20) },
    },
    required: ["status"],
  },
};

// Recursion: a >20-value enum on a property inside an array's object items,
// to exercise walkSchema and confirm the reported path includes the "items"
// hop.
const toolNestedLargeEnum: ToolDef = {
  name: "tool_nested_large_enum",
  description: "Does something with a list of records.",
  inputSchema: {
    type: "object",
    properties: {
      records: {
        type: "array",
        description: "Records to process.",
        items: {
          type: "object",
          properties: {
            category: { type: "string", description: "The category.", enum: values(25) },
          },
        },
      },
    },
    required: [],
  },
};

// Clean control: a small enum, well under the threshold. Zero findings
// expected.
const toolClean: ToolDef = {
  name: "tool_clean",
  description: "A fully documented tool with a small enum.",
  inputSchema: {
    type: "object",
    properties: {
      mode: { type: "string", description: "The mode.", enum: ["fast", "slow", "auto"] },
    },
    required: [],
  },
};

export const largeEnumTools: ToolDef[] = [
  toolLargeEnum,
  toolBoundaryEnum,
  toolNestedLargeEnum,
  toolClean,
];
