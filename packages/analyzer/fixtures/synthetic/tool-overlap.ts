import type { ToolDef } from "../../src/types.js";

// Positive pair: a one-character suffix turns one tool into a near-duplicate
// of the other. Array order already matches alphabetical order, so this pair
// alone would not catch a toolNames-ordering bug.
const toolDeleteItem: ToolDef = {
  name: "delete_item",
  description: "Delete a single item.",
  inputSchema: { type: "object", properties: {}, required: [] },
};

const toolDeleteItems: ToolDef = {
  name: "delete_items",
  description: "Delete multiple items.",
  inputSchema: { type: "object", properties: {}, required: [] },
};

// Positive pair, array order reversed from alphabetical: the longer name is
// placed first. Findings must sort toolNames alphabetically regardless of
// which tool appears first in the input array.
const toolUpdateRecords: ToolDef = {
  name: "update_records",
  description: "Update multiple records.",
  inputSchema: { type: "object", properties: {}, required: [] },
};

const toolUpdateRecord: ToolDef = {
  name: "update_record",
  description: "Update a single record.",
  inputSchema: { type: "object", properties: {}, required: [] },
};

// Near-miss pair: shares a "fetch_" prefix (Dice 0.4706) but stays below
// threshold. Without a pair in this band, every positive pair here scores
// >0.94 and every negative scores near 0, so the 0.6 cutoff itself is never
// exercised — any threshold between roughly 0.1 and 0.9 would pass the suite
// just as well.
const toolFetchUser: ToolDef = {
  name: "fetch_user",
  description: "Fetch a user.",
  inputSchema: { type: "object", properties: {}, required: [] },
};

const toolFetchOrder: ToolDef = {
  name: "fetch_order",
  description: "Fetch an order.",
  inputSchema: { type: "object", properties: {}, required: [] },
};

// Clean control: dissimilar from every other tool in this fixture. Pairs with
// all four of the above must produce zero findings.
const toolListFolders: ToolDef = {
  name: "list_folders",
  description: "List folders in a directory.",
  inputSchema: { type: "object", properties: {}, required: [] },
};

export const toolOverlapTools: ToolDef[] = [
  toolDeleteItem,
  toolDeleteItems,
  toolUpdateRecords,
  toolUpdateRecord,
  toolFetchUser,
  toolFetchOrder,
  toolListFolders,
];
