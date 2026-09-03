import {
  analyze,
  clusterOverlaps,
  describeCoverage,
} from "@mcp-context-cost/analyzer";
import { listServerSlugs, loadServer } from "../../../lib/servers";
import { ReportView } from "../../components/ReportView";
import { SiteHeader } from "../../components/SiteHeader";

export function generateStaticParams(): { slug: string }[] {
  return listServerSlugs().map((slug) => ({ slug }));
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
    <main className="mx-auto max-w-3xl px-6 py-10">
      <SiteHeader />

      <h1 className="mt-8 font-display text-3xl">{slug}</h1>

      <ReportView report={report} clusters={clusters} coverage={coverage} />
    </main>
  );
}
