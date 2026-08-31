import type { ToolDef } from "../../src/types.js";

// Positive case: four levels of nested object properties, one over the
// 3-level threshold. Path to the leaf is a.b.c.d.
const toolDeepNesting: ToolDef = {
  name: "tool_deep_nesting",
  description: "Does something with a deeply nested filter.",
  inputSchema: {
    type: "object",
    properties: {
      a: {
        type: "object",
        description: "Level a.",
        properties: {
          b: {
            type: "object",
            description: "Level b.",
            properties: {
              c: {
                type: "object",
                description: "Level c.",
                properties: {
                  d: { type: "string", description: "Level d, the leaf." },
                },
              },
            },
          },
        },
      },
    },
  },
};

// Boundary control, exactly at the threshold: depth 3 must not be flagged,
// since the rule fires on "more than 3", not "3 or more".
const toolBoundaryNesting: ToolDef = {
  name: "tool_boundary_nesting",
  description: "Does something with a moderately nested filter.",
  inputSchema: {
    type: "object",
    properties: {
      a: {
        type: "object",
        description: "Level a.",
        properties: {
          b: {
            type: "object",
            description: "Level b.",
            properties: {
              c: { type: "string", description: "Level c, the leaf." },
            },
          },
        },
      },
    },
  },
};

// Proves the items-hop exclusion: an array of objects containing an array
// of objects. The raw path to the leaf is
// ["list", "items", "sublist", "items", "leaf"] (length 5), but with
// "items" hops excluded the depth is 3 (list, sublist, leaf) — must not be
// flagged.
const toolItemsExcluded: ToolDef = {
  name: "tool_items_excluded",
  description: "Does something with a list of lists.",
  inputSchema: {
    type: "object",
    properties: {
      list: {
        type: "array",
        description: "Outer list.",
        items: {
          type: "object",
          properties: {
            sublist: {
              type: "array",
              description: "Inner list.",
              items: {
                type: "object",
                properties: {
                  leaf: { type: "string", description: "The leaf." },
                },
              },
            },
          },
        },
      },
    },
  },
};

// Two sibling branches both reaching depth 4. Must produce exactly one
// finding for the whole tool (not one per node), with the path
// deterministically pointing at the first-encountered maximum —
// branchA.p.q.r — since branchA is declared before branchB.
const toolTiedDepth: ToolDef = {
  name: "tool_tied_depth",
  description: "Does something with two equally nested branches.",
  inputSchema: {
    type: "object",
    properties: {
      branchA: {
        type: "object",
        description: "First branch.",
        properties: {
          p: {
            type: "object",
            description: "Level p.",
            properties: {
              q: {
                type: "object",
                description: "Level q.",
                properties: {
                  r: { type: "string", description: "Level r, the leaf." },
                },
              },
            },
          },
        },
      },
      branchB: {
        type: "object",
        description: "Second branch.",
        properties: {
          x: {
            type: "object",
            description: "Level x.",
            properties: {
              y: {
                type: "object",
                description: "Level y.",
                properties: {
                  z: { type: "string", description: "Level z, the leaf." },
                },
              },
            },
          },
        },
      },
    },
  },
};

// Clean control: a shallow schema, well under the threshold. Zero findings
// expected.
const toolClean: ToolDef = {
  name: "tool_clean",
  description: "A fully documented, shallow tool.",
  inputSchema: {
    type: "object",
    properties: {
      mode: { type: "string", description: "The mode." },
    },
    required: [],
  },
};

export const deepNestingTools: ToolDef[] = [
  toolDeepNesting,
  toolBoundaryNesting,
  toolItemsExcluded,
  toolTiedDepth,
  toolClean,
];
