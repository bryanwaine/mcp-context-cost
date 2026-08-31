import type { Finding, ToolDef } from "./types.js";
import { walkSchema } from "./schema-walk.js";

export interface ToolCoverage {
  toolName: string;
  hasDescription: boolean;
  parametersMissing: number;
  parametersTotal: number;
}

export interface CoverageSummary {
  tools: { withDescription: number; total: number };
  parameters: { withDescription: number; total: number };
  perTool: ToolCoverage[];
}

// Two ratios, not one blended figure: a missing tool description and a
// missing parameter description are different defects (missing-description
// reports them separately via `path`), and folding them into one
// documented/total number would smuggle in the composite score CLAUDE.md
// rules out. `tools` supplies what `findings` structurally cannot: a fully
// described tool or parameter leaves no finding, so the total side of each
// ratio has to come from the tool list, not from counting misses.
export function describeCoverage(
  findings: readonly Finding[],
  tools: readonly ToolDef[],
): CoverageSummary {
  const misses = findings.filter((f) => f.ruleId === "missing-description");

  const parametersTotalByTool = new Map<string, number>();
  for (const tool of tools) {
    parametersTotalByTool.set(tool.name, walkSchema(tool.inputSchema).length);
  }
  const parametersTotal = [...parametersTotalByTool.values()].reduce(
    (sum, n) => sum + n,
    0,
  );

  const toolLevelMisses = new Set<string>();
  const parametersMissingByTool = new Map<string, number>();
  for (const finding of misses) {
    const toolName = finding.toolNames[0];
    if (toolName === undefined) continue;
    if (finding.path === undefined) {
      toolLevelMisses.add(toolName);
    } else {
      parametersMissingByTool.set(
        toolName,
        (parametersMissingByTool.get(toolName) ?? 0) + 1,
      );
    }
  }

  const parametersMissing = [...parametersMissingByTool.values()].reduce(
    (sum, n) => sum + n,
    0,
  );

  const affectedToolNames = new Set([
    ...toolLevelMisses,
    ...parametersMissingByTool.keys(),
  ]);

  const perTool: ToolCoverage[] = [...affectedToolNames].map((toolName) => ({
    toolName,
    hasDescription: !toolLevelMisses.has(toolName),
    parametersMissing: parametersMissingByTool.get(toolName) ?? 0,
    parametersTotal: parametersTotalByTool.get(toolName) ?? 0,
  }));

  // Sort key only, never a returned field. Adding a tool-level miss to a
  // parameter miss count is not a meaningful quantity — it exists to order
  // rows, and reporting it would be the composite score the two separate
  // ratios above deliberately avoid.
  //
  // Consequence worth knowing: a tool with no description at all (badness 1)
  // sorts below a described tool with three undocumented parameters
  // (badness 3). Three defects outrank one.
  perTool.sort((a, b) => {
    const badnessA = (a.hasDescription ? 0 : 1) + a.parametersMissing;
    const badnessB = (b.hasDescription ? 0 : 1) + b.parametersMissing;
    if (badnessB !== badnessA) return badnessB - badnessA;
    return a.toolName.localeCompare(b.toolName);
  });

  return {
    tools: {
      withDescription: tools.length - toolLevelMisses.size,
      total: tools.length,
    },
    parameters: {
      withDescription: parametersTotal - parametersMissing,
      total: parametersTotal,
    },
    perTool,
  };
}
