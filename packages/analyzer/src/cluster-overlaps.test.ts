import { describe, expect, it } from "vitest";
import { clusterOverlaps } from "./cluster-overlaps.js";
import type { Finding } from "./types.js";

function overlap(a: string, b: string, measured: number): Finding {
  return {
    ruleId: "tool-overlap",
    toolNames: [a, b].sort(),
    measured,
    threshold: 0.6,
  };
}

describe("clusterOverlaps", () => {
  it("chains two findings sharing a tool into one 3-member cluster", () => {
    // b_tool is the bridge: a_tool-b_tool and b_tool-c_tool never co-occur
    // in a single finding, but share a member, so they merge.
    const findings = [overlap("a_tool", "b_tool", 0.7), overlap("b_tool", "c_tool", 0.65)];

    const clusters = clusterOverlaps(findings);

    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.toolNames).toEqual(["a_tool", "b_tool", "c_tool"]);
    expect(clusters[0]?.findingCount).toBe(2);
  });

  it("keeps an unrelated pair as its own cluster", () => {
    const findings = [overlap("a_tool", "b_tool", 0.7), overlap("d_tool", "e_tool", 0.8)];

    const clusters = clusterOverlaps(findings);

    expect(clusters).toHaveLength(2);
    const clusterFor = (name: string) => clusters.find((c) => c.toolNames.includes(name));
    expect(clusterFor("a_tool")?.toolNames).toEqual(["a_tool", "b_tool"]);
    expect(clusterFor("d_tool")?.toolNames).toEqual(["d_tool", "e_tool"]);
  });

  it("sorts members alphabetically regardless of the finding's toolNames order", () => {
    const findings: Finding[] = [
      { ruleId: "tool-overlap", toolNames: ["z_tool", "a_tool"], measured: 0.7, threshold: 0.6 },
    ];

    const clusters = clusterOverlaps(findings);

    expect(clusters[0]?.toolNames).toEqual(["a_tool", "z_tool"]);
  });

  it("sorts clusters by descending size, then alphabetically by first member", () => {
    // Fed out of size order and out of alphabetical order to prove both keys apply.
    const findings = [
      overlap("m_tool", "n_tool", 0.7), // size 2
      overlap("x_tool", "y_tool", 0.7), // size 2, alphabetically after m/n
      overlap("a_tool", "b_tool", 0.7), // size 3
      overlap("b_tool", "c_tool", 0.7), // size 3
    ];

    const clusters = clusterOverlaps(findings);

    expect(clusters.map((c) => c.toolNames)).toEqual([
      ["a_tool", "b_tool", "c_tool"],
      ["m_tool", "n_tool"],
      ["x_tool", "y_tool"],
    ]);
  });

  it("computes findingCount and similarityRange per cluster", () => {
    const findings = [
      overlap("a_tool", "b_tool", 0.9),
      overlap("b_tool", "c_tool", 0.65),
      overlap("d_tool", "e_tool", 0.75),
    ];

    const clusters = clusterOverlaps(findings);

    const abc = clusters.find((c) => c.toolNames.includes("a_tool"));
    expect(abc?.findingCount).toBe(2);
    expect(abc?.similarityRange).toEqual({ min: 0.65, max: 0.9 });

    const de = clusters.find((c) => c.toolNames.includes("d_tool"));
    expect(de?.findingCount).toBe(1);
    expect(de?.similarityRange).toEqual({ min: 0.75, max: 0.75 });
  });

  it("ignores findings from other rules, even when they name overlapping tools", () => {
    const findings: Finding[] = [
      overlap("a_tool", "b_tool", 0.7),
      { ruleId: "missing-description", toolNames: ["c_tool"] },
    ];

    const clusters = clusterOverlaps(findings);

    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.toolNames).toEqual(["a_tool", "b_tool"]);
  });

  it("returns an empty array when there are no tool-overlap findings", () => {
    const findings: Finding[] = [{ ruleId: "missing-description", toolNames: ["a_tool"] }];

    expect(clusterOverlaps(findings)).toEqual([]);
  });

  it("returns an empty array for an empty input", () => {
    expect(clusterOverlaps([])).toEqual([]);
  });
});
