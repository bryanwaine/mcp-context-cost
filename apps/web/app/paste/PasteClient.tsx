"use client";

import { useEffect, useRef, useState } from "react";
import type {
  CoverageSummary,
  OverlapCluster,
  Report,
} from "@mcp-context-cost/analyzer";
import { parsePastedTools, type ParseFailure } from "../../lib/parsePastedTools";
import { ReportView } from "../components/ReportView";

type AnalyzerModule = typeof import("@mcp-context-cost/analyzer");

interface AnalyzedResult {
  report: Report;
  clusters: OverlapCluster[];
  coverage: CoverageSummary;
}

export function PasteClient() {
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<ParseFailure | null>(null);
  const [result, setResult] = useState<AnalyzedResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Kicked off on mount so the ~1MB tokenizer chunk is usually warm by the
  // time someone finishes pasting — the page shell above renders long before
  // this resolves, and Analyze awaits it if it hasn't yet.
  const analyzerPromise = useRef<Promise<AnalyzerModule> | null>(null);
  useEffect(() => {
    analyzerPromise.current = import("@mcp-context-cost/analyzer");
  }, []);

  async function handleAnalyze() {
    setError(null);
    setResult(null);

    const parsed = parsePastedTools(raw);
    if (!parsed.ok) {
      setError(parsed);
      return;
    }

    setAnalyzing(true);
    try {
      const mod = await (analyzerPromise.current ??=
        import("@mcp-context-cost/analyzer"));
      const report = mod.analyze(parsed.tools);
      const clusters = mod.clusterOverlaps(report.findings);
      const coverage = mod.describeCoverage(report.findings, parsed.tools);
      setResult({ report, clusters, coverage });
    } catch (err) {
      // parsePastedTools catches the known crash (a tool with no inputSchema
      // reaches walkSchema and throws), but a schema malformed in some other
      // way could still fail inside the analyzer. Without this the button
      // would sit disabled on "Analyzing…" with nothing shown.
      setError({
        ok: false,
        stage: "tools",
        message: `The analyzer could not process this input: ${
          err instanceof Error ? err.message : String(err)
        }`,
      });
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="mt-6">
      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        aria-label="Pasted tools/list response"
        spellCheck={false}
        rows={10}
        placeholder='[{"name": "create_issue", "inputSchema": {"type": "object", "properties": {}}}, ...]'
        className="w-full rounded border border-rule bg-paper px-3 py-2 font-mono text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-measure"
      />

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={analyzing || raw.trim() === ""}
          className="rounded bg-ink px-4 py-2 text-sm text-paper disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-measure"
        >
          {analyzing ? "Analyzing…" : "Analyze"}
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded border border-flag/40 px-3 py-2">
          <p className="text-sm text-flag">{error.message}</p>
          {error.details ? (
            <ul className="mt-2 space-y-1 text-sm text-muted">
              {error.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {result ? (
        <ReportView
          report={result.report}
          clusters={result.clusters}
          coverage={result.coverage}
        />
      ) : null}
    </div>
  );
}
