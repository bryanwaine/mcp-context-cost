import type { Finding } from "./types.js";

export interface OverlapCluster {
  toolNames: string[];
  findingCount: number;
  similarityRange: { min: number; max: number };
}

// Union-find over tool-overlap findings: nodes are tool names, edges are each
// finding's toolNames pair. Connected components, not cliques — a tool can
// join a cluster via a chain of pairwise overlaps without directly
// overlapping every other member.
//
// That is deliberate. The finding on a server like antv-chart is that one
// naming convention spans 14 tools, not that any particular pair is redundant.
// Splitting into cliques would imply a distinction tool-overlap did not make.
export function clusterOverlaps(findings: readonly Finding[]): OverlapCluster[] {
  const overlaps = findings.filter(
    (f): f is Finding & { measured: number } =>
      f.ruleId === "tool-overlap" && f.measured !== undefined,
  );

  const parent = new Map<string, string>();

  function find(name: string): string {
    let root = name;
    while (parent.get(root) !== root) root = parent.get(root) as string;
    let current = name;
    while (parent.get(current) !== root) {
      const next = parent.get(current) as string;
      parent.set(current, root);
      current = next;
    }
    return root;
  }

  function union(a: string, b: string): void {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent.set(rootA, rootB);
  }

  for (const finding of overlaps) {
    for (const name of finding.toolNames) {
      if (!parent.has(name)) parent.set(name, name);
    }
  }

  for (const finding of overlaps) {
    const [a, b] = finding.toolNames;
    // tool-overlap always emits exactly two names. Defensive: a malformed
    // finding must not create a node named `undefined`.
    if (a === undefined || b === undefined) continue;
    union(a, b);
  }

  const members = new Map<string, Set<string>>();
  for (const name of parent.keys()) {
    const root = find(name);
    let group = members.get(root);
    if (!group) {
      group = new Set();
      members.set(root, group);
    }
    group.add(name);
  }

  // Keyed on the first name only: after all unions, both members of a pair
  // resolve to the same root, so either name buckets the finding identically.
  const clusterFindings = new Map<string, (Finding & { measured: number })[]>();
  for (const finding of overlaps) {
    const first = finding.toolNames[0];
    if (first === undefined) continue;
    const root = find(first);
    let group = clusterFindings.get(root);
    if (!group) {
      group = [];
      clusterFindings.set(root, group);
    }
    group.push(finding);
  }

  const clusters: OverlapCluster[] = [];
  for (const [root, names] of members) {
    const groupFindings = clusterFindings.get(root);
    // Every node in `parent` was added from a finding, so every root has at
    // least one contributing finding. Empty here would mean the union-find and
    // the finding-grouping disagree, and Math.min over an empty array would
    // silently produce Infinity rather than failing.
    if (!groupFindings || groupFindings.length === 0) continue;

    const scores = groupFindings.map((f) => f.measured);
    clusters.push({
      toolNames: [...names].sort(),
      findingCount: groupFindings.length,
      similarityRange: { min: Math.min(...scores), max: Math.max(...scores) },
    });
  }

  clusters.sort((a, b) => {
    if (b.toolNames.length !== a.toolNames.length) {
      return b.toolNames.length - a.toolNames.length;
    }
    return (a.toolNames[0] ?? "").localeCompare(b.toolNames[0] ?? "");
  });

  return clusters;
}
