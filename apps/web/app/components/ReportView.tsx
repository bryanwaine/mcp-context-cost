import type {
  CoverageSummary,
  Finding,
  OverlapCluster,
  Report,
  RuleId,
  TokenizerInfo,
} from "@mcp-context-cost/analyzer";

function tokenizerCaveat(tokenizer: TokenizerInfo): string {
  const approximation = tokenizer.approximate
    ? "an approximation, not exact"
    : "exact";
  return `Token counts use the ${tokenizer.id} encoding and are ${approximation} — this is OpenAI's tokenizer, not Anthropic's.`;
}

const RULE_IDS: RuleId[] = [
  "missing-description",
  "large-enum",
  "tool-overlap",
  "deep-nesting",
];

function findingsFor(findings: readonly Finding[], ruleId: RuleId): Finding[] {
  return findings.filter((f) => f.ruleId === ruleId);
}

export function ReportView({
  report,
  clusters,
  coverage,
}: {
  report: Report;
  clusters: OverlapCluster[];
  coverage: CoverageSummary;
}) {
  const proportion =
    report.measurements.serverTotalTokens /
    report.measurements.contextWindowTokens;

  return (
    <>
      <p className="mt-6 tabular-nums text-measure">
        <span className="text-2xl font-medium">
          {report.measurements.serverTotalTokens.toLocaleString()}
        </span>{" "}
        tokens
      </p>
      {/* Unclamped: a server exceeding the context window should render as a
          visibly broken bar, not one indistinguishable from a server at
          exactly 100%. That would be the most significant finding this
          project has produced. */}
      <div className="mt-2 h-2 w-full rounded-full bg-rule">
        <div
          className="h-2 rounded-full bg-measure"
          style={{ width: `${proportion * 100}%` }}
        />
      </div>
      <p className="mt-1 text-sm text-muted">
        {(proportion * 100).toFixed(2)}% of a{" "}
        {report.measurements.contextWindowTokens.toLocaleString()}-token context
        window
      </p>

      <p className="mt-4 text-sm text-muted">
        {tokenizerCaveat(report.tokenizer)}
      </p>

      <p className="mt-8 tabular-nums text-measure">
        {report.measurements.perTool.length} tools,{" "}
        {report.measurements.averageTokensPerTool.toFixed(1)} tokens per tool
        average
      </p>

      <table className="mt-4 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-rule text-left text-muted">
            <th className="py-2 font-normal">Tool</th>
            <th className="py-2 font-normal">Tokens</th>
          </tr>
        </thead>
        <tbody>
          {report.measurements.perTool.map((tool) => (
            <tr key={tool.toolName} className="border-b border-rule">
              <td className="py-2 font-mono">{tool.toolName}</td>
              <td className="py-2 tabular-nums text-measure">{tool.tokens}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mt-10 font-display text-xl">Findings</h2>

      <h3 className="mt-6 font-display text-base">tool-overlap</h3>
      {clusters.length === 0 ? (
        <p className="mt-2 text-sm text-muted">no findings</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm">
          {clusters.map((cluster) => (
            <li key={cluster.toolNames.join(",")}>
              {cluster.toolNames.join(", ")} — overlap, {cluster.findingCount}{" "}
              finding
              {cluster.findingCount === 1 ? "" : "s"}, similarity{" "}
              <span className="text-flag">
                {cluster.similarityRange.min.toFixed(2)}–
                {cluster.similarityRange.max.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <h3 className="mt-6 font-display text-base">missing-description</h3>
      <p className="mt-2 text-sm text-muted">
        tools: {coverage.tools.withDescription}/{coverage.tools.total} described
      </p>
      <p className="text-sm text-muted">
        parameters: {coverage.parameters.withDescription}/
        {coverage.parameters.total} described
      </p>
      {coverage.perTool.length === 0 ? (
        <p className="mt-2 text-sm text-muted">no findings</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm">
          {coverage.perTool.map((tool) => (
            <li key={tool.toolName}>
              <span className="font-mono">{tool.toolName}</span> —{" "}
              <span className={tool.hasDescription ? "" : "text-flag"}>
                tool {tool.hasDescription ? "documented" : "undocumented"}
              </span>
              ,{" "}
              <span className={tool.parametersMissing > 0 ? "text-flag" : ""}>
                {tool.parametersMissing} of {tool.parametersTotal} parameters
                undocumented
              </span>
            </li>
          ))}
        </ul>
      )}

      {RULE_IDS.filter(
        (id) => id !== "tool-overlap" && id !== "missing-description",
      ).map((ruleId) => {
        const findings = findingsFor(report.findings, ruleId);
        return (
          <div key={ruleId}>
            <h3 className="mt-6 font-display text-base">{ruleId}</h3>
            {findings.length === 0 ? (
              <p className="mt-2 text-sm text-muted">no findings</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {findings.map((finding, index) => (
                  <li key={`${finding.toolNames.join(",")}-${index}`}>
                    <span className="font-mono">
                      {finding.toolNames.join(", ")}
                    </span>
                    {finding.path ? ` at ${finding.path.join(".")}` : ""}
                    {finding.measured !== undefined &&
                    finding.threshold !== undefined ? (
                      <>
                        : <span className="text-flag">{finding.measured}</span>{" "}
                        (limit {finding.threshold})
                      </>
                    ) : null}
                    {finding.tokenCost !== undefined ? (
                      <>
                        {" "}
                        —{" "}
                        <span className="text-flag">
                          {finding.tokenCost} tokens
                        </span>
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </>
  );
}
