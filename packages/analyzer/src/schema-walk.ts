import type { JsonSchema, SchemaPath } from "./types.js";

export interface SchemaNode {
  path: SchemaPath;
  schema: JsonSchema;
}

// Walks every named property beneath a schema, recursing through nested
// object properties and through array items. "items" is appended to the
// path as a transparent hop when descending into an array's item schema —
// the items schema itself is never yielded as a node, only named properties
// found within it. Tuple-form `items` (an array of schemas) is not
// traversed. Known limitation: none of the three captured fixtures use it,
// but this walker runs against arbitrary published servers, so it may be
// encountered.
export function walkSchema(root: JsonSchema): SchemaNode[] {
  const nodes: SchemaNode[] = [];

  function visit(schema: JsonSchema, path: SchemaPath): void {
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        const propPath = [...path, key];
        nodes.push({ path: propPath, schema: propSchema });
        visit(propSchema, propPath);
      }
    }
    if (schema.items && !Array.isArray(schema.items)) {
      visit(schema.items, [...path, "items"]);
    }
  }

  visit(root, []);
  return nodes;
}
