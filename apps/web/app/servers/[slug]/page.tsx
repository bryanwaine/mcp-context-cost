import {
  analyze,
  clusterOverlaps,
  describeCoverage,
} from "@mcp-context-cost/analyzer";
import type {
  Finding,
  RuleId,
  TokenizerInfo,
} from "@mcp-context-cost/analyzer";
import { listServerSlugs, loadServer } from "../../../lib/servers";

export function generateStaticParams(): { slug: string }[] {
  return listServerSlugs().map((slug) => ({ slug }));
}

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

export default async function ServerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { tools } = loadServer(slug);
  const report = analyze(tools);
  const clusters = clusterOverlaps(report.findings);
  const coverage = describeCoverage(report.findings, tools);

  return (
    <main>
      <h1>{slug}</h1>

      <p>{tools.length} tools</p>
      <p>{report.measurements.serverTotalTokens} tokens total</p>
      <p>
        {report.measurements.averageTokensPerTool.toFixed(1)} tokens per tool,
        averaged
      </p>
      <p>{tokenizerCaveat(report.tokenizer)}</p>

      <h2>Tools</h2>
      <table>
        <thead>
          <tr>
            <th>Tool</th>
            <th>Tokens</th>
          </tr>
        </thead>
        <tbody>
          {report.measurements.perTool.map((tool) => (
            <tr key={tool.toolName}>
              <td>{tool.toolName}</td>
              <td>{tool.tokens}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Findings</h2>

      <h3>tool-overlap</h3>
      {clusters.length === 0 ? (
        <p>no findings</p>
      ) : (
        <ul>
          {clusters.map((cluster) => (
            <li key={cluster.toolNames.join(",")}>
              {cluster.toolNames.join(", ")} — {cluster.findingCount} finding
              {cluster.findingCount === 1 ? "" : "s"}, similarity{" "}
              {cluster.similarityRange.min.toFixed(2)}–
              {cluster.similarityRange.max.toFixed(2)}
            </li>
          ))}
        </ul>
      )}

      <h3>missing-description</h3>
      <p>
        tools: {coverage.tools.withDescription}/{coverage.tools.total} described
      </p>
      <p>
        parameters: {coverage.parameters.withDescription}/
        {coverage.parameters.total} described
      </p>
      {coverage.perTool.length === 0 ? (
        <p>no findings</p>
      ) : (
        <ul>
          {coverage.perTool.map((tool) => (
            <li key={tool.toolName}>
              {tool.toolName} — tool{" "}
              {tool.hasDescription ? "documented" : "undocumented"},{" "}
              {tool.parametersMissing} of {tool.parametersTotal} parameters
              undocumented
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
            <h3>{ruleId}</h3>
            {findings.length === 0 ? (
              <p>no findings</p>
            ) : (
              <ul>
                {findings.map((finding, index) => (
                  <li key={`${finding.toolNames.join(",")}-${index}`}>
                    {finding.toolNames.join(", ")}
                    {finding.path ? ` — ${finding.path.join(".")}` : ""}
                    {finding.measured !== undefined &&
                    finding.threshold !== undefined
                      ? ` — ${finding.measured} (threshold ${finding.threshold})`
                      : ""}
                    {finding.tokenCost !== undefined
                      ? ` — ${finding.tokenCost} tokens`
                      : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </main>
  );
}
