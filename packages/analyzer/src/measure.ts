import type { Measurements, ToolDef, ToolMeasurement } from "./types.js";
import { countTokens } from "./tokenize.js";

const CONTEXT_WINDOW_TOKENS = 200_000;

export function measure(tools: readonly ToolDef[]): Measurements {
  const perTool: ToolMeasurement[] = tools.map((tool) => ({
    toolName: tool.name,
    tokens: countTokens(tool),
  }));

  // Measured in one pass over the full array, never summed from perTool.
  // Joining boundaries (array brackets, commas between objects) tokenize
  // differently when adjacent to neighbouring content than when each tool is
  // tokenized in isolation, so the two figures differ. Measured on
  // filesystem.json: 2,795 single-pass vs 2,793 summed. The single-pass figure
  // is what a host actually sends.
  const serverTotalTokens = countTokens(tools);

  // Averaged over the per-tool measurements, not derived from
  // serverTotalTokens: those are different measurements and mixing them would
  // give a figure that matches neither.
  const perToolTotal = perTool.reduce((sum, t) => sum + t.tokens, 0);
  const averageTokensPerTool =
    tools.length === 0 ? 0 : perToolTotal / tools.length;

  return {
    perTool,
    serverTotalTokens,
    averageTokensPerTool,
    contextWindowTokens: CONTEXT_WINDOW_TOKENS,
  };
}