export interface LabelPoint {
  id: string;
  x: number;
  y: number;
  text: string;
}

export interface PlacedLabel {
  id: string;
  x: number;
  y: number;
  anchor: "start" | "end";
  leaderTo?: { x: number; y: number };
}

export interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const CHAR_WIDTH = 6.4;
export const LABEL_HEIGHT = 13;
const GAP = 6;

/**
 * Exported so callers can size obstacle boxes for text they draw themselves
 * (the quadrant labels) using the same character-width estimate this module
 * uses internally. Two independent estimates would drift.
 */
export function estimateTextWidth(text: string): number {
  return text.length * CHAR_WIDTH;
}

function boxOverlaps(a: Box, b: Box, margin: number): boolean {
  return (
    a.left - margin < b.right &&
    a.right + margin > b.left &&
    a.top - margin < b.bottom &&
    a.bottom + margin > b.top
  );
}

function labelBox(
  anchorX: number,
  anchorY: number,
  width: number,
  align: "start" | "end",
): Box {
  const left = align === "start" ? anchorX : anchorX - width;
  return {
    left,
    right: left + width,
    top: anchorY - LABEL_HEIGHT,
    bottom: anchorY,
  };
}

function withinBounds(box: Box, bounds: Bounds): boolean {
  return (
    box.left >= bounds.minX &&
    box.right <= bounds.maxX &&
    box.top >= bounds.minY &&
    box.bottom <= bounds.maxY
  );
}

/**
 * Deterministic, build-time label placement for a scatter plot. Tries a fixed
 * set of anchors around each point in priority order and accepts the first
 * one that clashes with neither the plot bounds, an already-placed label, nor
 * any supplied obstacle. If nothing clears, spirals the label out along the
 * top-right diagonal and draws a leader line back to the point.
 *
 * `obstacles` must include the data points themselves — otherwise a label can
 * land squarely on another server's dot, which reads as a mislabelled point
 * rather than a collision.
 */
export function layoutLabels(
  points: readonly LabelPoint[],
  bounds: Bounds,
  obstacles: readonly Box[] = [],
): PlacedLabel[] {
  const placed: PlacedLabel[] = [];
  const placedBoxes: Box[] = [...obstacles];

  const ordered = [...points].sort((a, b) => a.y - b.y || a.x - b.x);

  for (const point of ordered) {
    const width = estimateTextWidth(point.text);

    const candidates: { x: number; y: number; align: "start" | "end" }[] = [
      { x: point.x + GAP, y: point.y - GAP, align: "start" },
      { x: point.x - GAP, y: point.y - GAP, align: "end" },
      { x: point.x + GAP, y: point.y + GAP + LABEL_HEIGHT, align: "start" },
      { x: point.x - GAP, y: point.y + GAP + LABEL_HEIGHT, align: "end" },
    ];

    let chosen: { x: number; y: number; align: "start" | "end" } | null = null;

    for (const candidate of candidates) {
      const box = labelBox(candidate.x, candidate.y, width, candidate.align);
      if (
        withinBounds(box, bounds) &&
        !placedBoxes.some((existing) => boxOverlaps(box, existing, 2))
      ) {
        chosen = candidate;
        break;
      }
    }

    let leaderTo: { x: number; y: number } | undefined;

    if (!chosen) {
      let radius = GAP;
      const step = LABEL_HEIGHT + 2;
      for (let attempt = 0; attempt < 12 && !chosen; attempt += 1) {
        radius += step;
        const candidate = {
          x: point.x + radius,
          y: point.y - radius,
          align: "start" as const,
        };
        const box = labelBox(candidate.x, candidate.y, width, candidate.align);
        const clamped: Box = {
          left: Math.min(box.left, bounds.maxX - width),
          right: Math.min(box.right, bounds.maxX),
          top: Math.max(box.top, bounds.minY),
          bottom: Math.max(box.bottom, bounds.minY + LABEL_HEIGHT),
        };
        if (!placedBoxes.some((existing) => boxOverlaps(clamped, existing, 2))) {
          chosen = { x: clamped.left, y: clamped.bottom, align: "start" };
          leaderTo = { x: point.x, y: point.y };
        }
      }
    }

    // Last resort: every candidate and every spiral step was blocked. Place at
    // the default anchor and accept the overlap, but always draw a leader so a
    // failure is traceable to its point rather than silently mislabelling one.
    if (!chosen) {
      chosen = { x: point.x + GAP, y: point.y - GAP, align: "start" };
      leaderTo = { x: point.x, y: point.y };
    }

    placedBoxes.push(labelBox(chosen.x, chosen.y, width, chosen.align));
    placed.push({
      id: point.id,
      x: chosen.x,
      y: chosen.y,
      anchor: chosen.align,
      leaderTo,
    });
  }

  return placed;
}