import { describe, expect, it } from "vitest";
import { trigramSimilarity } from "./similarity.js";

describe("trigramSimilarity", () => {
  it("returns 1 for identical strings", () => {
    expect(trigramSimilarity("read_file", "read_file")).toBe(1);
  });

  it("returns 0 for strings sharing no trigrams", () => {
    expect(trigramSimilarity("read_file", "xyz_qrs")).toBe(0);
  });

  it("returns 1 for a case-insensitive exact match shorter than 3 characters", () => {
    expect(trigramSimilarity("ab", "AB")).toBe(1);
  });

  it("returns 0 for two different strings both shorter than 3 characters", () => {
    expect(trigramSimilarity("ab", "cd")).toBe(0);
  });

  it("pins the read_file / read_text_file calibration ratio from CLAUDE.md", () => {
    expect(trigramSimilarity("read_file", "read_text_file")).toBeCloseTo(0.6316, 4);
  });

  it("pins the read_file / move_file calibration ratio from CLAUDE.md", () => {
    expect(trigramSimilarity("read_file", "move_file")).toBeCloseTo(0.4286, 4);
  });

  it("returns 0 when only one name is shorter than three characters", () => {
    expect(trigramSimilarity("ab", "delete_item")).toBe(0);
  });
});
