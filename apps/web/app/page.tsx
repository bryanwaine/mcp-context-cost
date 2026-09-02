import Link from "next/link";
import { analyze } from "@mcp-context-cost/analyzer";
import { listServerSlugs, loadServer } from "../lib/servers";
import { ThemeToggle } from "./components/ThemeToggle";
import { ScatterPlot } from "./components/ScatterPlot";

const CONTEXT_WINDOW_TOKENS = 200_000;

interface ServerSummary {
  slug: string;
  toolCount: number;
  totalTokens: number;
  avgTokensPerTool: number;
}

function loadSummaries(): ServerSummary[] {
  return listServerSlugs().map((slug) => {
    const { tools } = loadServer(slug);
    const report = analyze(tools);
    return {
      slug,
      toolCount: tools.length,
      totalTokens: report.measurements.serverTotalTokens,
      avgTokensPerTool: report.measurements.averageTokensPerTool,
    };
  });
}

// Deliberately unclamped by default: a server exceeding the context window
// should render as a visibly broken bar, not as one indistinguishable from a
// server sitting at exactly 100%. That would be the most significant finding
// this project has produced, and it should not be hidden by a CSS clamp.
// The stacked total opts into clamping because it aggregates and will
// eventually exceed the window by design.
function ProportionBar({
  proportion,
  clamp = false,
}: {
  proportion: number;
  clamp?: boolean;
}) {
  const width = clamp ? Math.min(proportion * 100, 100) : proportion * 100;
  return (
    <div className="h-2 w-full rounded-full bg-rule">
      <div
        className="h-2 rounded-full bg-measure"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export default function IndexPage() {
  const summaries = loadSummaries();
  const ranked = [...summaries].sort((a, b) => b.totalTokens - a.totalTokens);
  const stackedTotal = summaries.reduce((sum, s) => sum + s.totalTokens, 0);
  const stackedProportion = stackedTotal / CONTEXT_WINDOW_TOKENS;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between border-b border-rule pb-4">
        <h1 className="font-display text-xl">mcp-context-cost</h1>
        <ThemeToggle />
      </div>

      <p className="mt-6 text-sm text-muted">
        Context-window cost of {summaries.length} published MCP servers,
        measured offline before you connect.
      </p>
      {/* Canonical caveat is composed from report.tokenizer on the server
          pages; kept in sync by hand here since this page aggregates twelve
          reports rather than showing one. */}
      <p className="mt-2 text-sm text-muted">
        Counts use the o200k_base encoding and are approximate — that is
        OpenAI&rsquo;s tokenizer, not Anthropic&rsquo;s.
      </p>

      <h2 className="mt-10 font-display text-lg">
        Tool count vs. tokens per tool
      </h2>
      <div className="mx-auto mt-4 w-full">
        <ScatterPlot points={summaries} />
      </div>
      <p className="mt-3 text-sm text-muted">
        Total cost is roughly tools × tokens per tool, so two servers can cost
        the same for opposite reasons — one broad and lean, one small and
        verbose.
      </p>

      <h2 className="mt-10 font-display text-lg">All servers</h2>
      <p className="mt-2 text-sm text-muted">
        Ranked by total tokens — the number that answers what connecting a
        server costs. Average tokens per tool measures verbosity per tool
        instead, and the two rankings invert: a server can rank high on one
        and low on the other, since total is roughly their product.
      </p>

      <table className="mt-4 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-rule text-left text-muted">
            <th className="py-2 font-normal">Server</th>
            <th className="py-2 font-normal">Tools</th>
            <th className="hidden py-2 font-normal sm:table-cell">
              Avg tokens/tool
            </th>
            <th className="py-2 font-normal">Total tokens</th>
            <th className="py-2 font-normal">% of context window</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((server) => {
            const proportion = server.totalTokens / CONTEXT_WINDOW_TOKENS;
            return (
              <tr key={server.slug} className="border-b border-rule">
                <td className="py-2">
                  <Link
                    href={`/servers/${server.slug}/`}
                    className="font-mono underline decoration-rule underline-offset-2 hover:text-measure focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-measure"
                  >
                    {server.slug}
                  </Link>
                </td>
                <td className="py-2 tabular-nums">{server.toolCount}</td>
                <td className="hidden py-2 tabular-nums sm:table-cell">
                  {server.avgTokensPerTool.toFixed(1)}
                </td>
                <td className="py-2 tabular-nums text-measure">
                  {server.totalTokens.toLocaleString()}
                </td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-24">
                      <ProportionBar proportion={proportion} />
                    </div>
                    <span className="tabular-nums text-muted">
                      {(proportion * 100).toFixed(2)}%
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2 className="mt-10 font-display text-lg">
        Connecting all {summaries.length}
      </h2>
      <p className="mt-2 text-sm text-muted">
        Individually these servers look cheap. Stacked, they show what
        connecting several at once actually costs.
      </p>
      <p className="mt-4 tabular-nums text-measure">
        <span className="text-2xl font-medium">
          {stackedTotal.toLocaleString()}
        </span>{" "}
        tokens
      </p>
      <div className="mt-2">
        <ProportionBar proportion={stackedProportion} clamp />
      </div>
      <p className="mt-1 text-sm text-muted">
        {(stackedProportion * 100).toFixed(2)}% of a{" "}
        {CONTEXT_WINDOW_TOKENS.toLocaleString()}-token context window
      </p>
    </main>
  );
}
