import { describe, expect, it } from "vitest";
import { walkSchema } from "./schema-walk.js";
import type { JsonSchema } from "./types.js";

describe("walkSchema", () => {
  it("returns no nodes for a schema with no properties", () => {
    const schema: JsonSchema = { type: "object" };

    expect(walkSchema(schema)).toEqual([]);
  });

  it("returns one node per top-level property", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: {
        a: { type: "string" },
        b: { type: "number" },
      },
    };

    const paths = walkSchema(schema).map((node) => node.path);
    expect(paths).toEqual([["a"], ["b"]]);
  });

  it("recurses into a nested object property, extending the path", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: {
        options: {
          type: "object",
          properties: {
            retries: { type: "number" },
          },
        },
      },
    };

    const paths = walkSchema(schema).map((node) => node.path);
    expect(paths).toEqual([["options"], ["options", "retries"]]);
  });

  it("yields only the array property itself for an array of primitives", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: {
        tags: {
          type: "array",
          items: { type: "string" },
        },
      },
    };

    const paths = walkSchema(schema).map((node) => node.path);
    expect(paths).toEqual([["tags"]]);
  });

  it("recurses into an array's object items, inserting 'items' as a path segment", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: {
        files: {
          type: "array",
          items: {
            type: "object",
            properties: {
              path: { type: "string" },
            },
          },
        },
      },
    };

    const paths = walkSchema(schema).map((node) => node.path);
    expect(paths).toEqual([["files"], ["files", "items", "path"]]);
  });

  it("accumulates the path across three or more levels of nesting", () => {
    const schema: JsonSchema = {
      type: "object",
      properties: {
        a: {
          type: "object",
          properties: {
            b: {
              type: "object",
              properties: {
                c: { type: "string" },
              },
            },
          },
        },
      },
    };

    const paths = walkSchema(schema).map((node) => node.path);
    expect(paths).toEqual([["a"], ["a", "b"], ["a", "b", "c"]]);
  });

  it("pairs each path with its own schema", () => {
  const schema: JsonSchema = {
    type: "object",
    properties: {
      a: { type: "string", description: "the a" },
      b: { type: "number", description: "the b" },
    },
  };

  const nodes = walkSchema(schema);
  expect(nodes[0]?.schema.description).toBe("the a");
  expect(nodes[1]?.schema.description).toBe("the b");
});
});
