import {
  estimateTextWidth,
  layoutLabels,
  LABEL_HEIGHT,
  type Box,
} from "../../lib/labelLayout";

export interface ScatterPoint {
  slug: string;
  toolCount: number;
  avgTokensPerTool: number;
}

const VIEW_WIDTH = 560;
const VIEW_HEIGHT = 400;
const MARGIN = { top: 20, right: 20, bottom: 34, left: 44 };

const PLOT_MIN_X = MARGIN.left;
const PLOT_MAX_X = VIEW_WIDTH - MARGIN.right;
const PLOT_MIN_Y = MARGIN.top;
const PLOT_MAX_Y = VIEW_HEIGHT - MARGIN.bottom;

const POINT_R = 3.5;
const FONT_SIZE = 10;

// 20 tools is roughly where a server stops being one focused tool and starts
// being a platform surface. 300 tokens/tool sits above every well-authored
// server measured so far and below the two known-verbose ones. Both are fixed,
// not derived from the current sample, so a server's quadrant describes the
// server rather than shifting on every new capture.
const TOOL_THRESHOLD = 20;
const TOKEN_THRESHOLD = 300;

function niceStep(domainMax: number): number {
  const rough = domainMax / 5;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const residual = rough / magnitude;
  const niceResidual = residual > 5 ? 10 : residual > 2 ? 5 : residual > 1 ? 2 : 1;
  return niceResidual * magnitude;
}

function ticksFor(domainMax: number): number[] {
  const step = niceStep(domainMax);
  const ticks: number[] = [];
  for (let tick = 0; tick <= domainMax; tick += step) {
    ticks.push(tick);
  }
  return ticks;
}

export function ScatterPlot({ points }: { points: readonly ScatterPoint[] }) {
  const xDomainMax = Math.max(...points.map((p) => p.toolCount)) * 1.1;
  const yDomainMax = Math.max(...points.map((p) => p.avgTokensPerTool)) * 1.1;

  const scaleX = (value: number) =>
    PLOT_MIN_X + (value / xDomainMax) * (PLOT_MAX_X - PLOT_MIN_X);
  const scaleY = (value: number) =>
    PLOT_MAX_Y - (value / yDomainMax) * (PLOT_MAX_Y - PLOT_MIN_Y);

  const xTicks = ticksFor(xDomainMax);
  const yTicks = ticksFor(yDomainMax);

  // Rendered from this array rather than four hardcoded <text> elements, so the
  // obstacle boxes below cannot drift from what is actually drawn.
  const quadrantLabels = [
    { text: "Cheap either way", x: PLOT_MIN_X + 4, y: PLOT_MAX_Y - 6, align: "start" as const },
    { text: "Few tools, each expensive to read", x: PLOT_MIN_X + 4, y: PLOT_MIN_Y + 12, align: "start" as const },
    { text: "Broad, not bloated", x: PLOT_MAX_X - 4, y: PLOT_MAX_Y - 6, align: "end" as const },
    { text: "Costly on both counts", x: PLOT_MAX_X - 4, y: PLOT_MIN_Y + 12, align: "end" as const },
  ];

  const quadrantObstacles: Box[] = quadrantLabels.map((q) => {
    const width = estimateTextWidth(q.text);
    const left = q.align === "start" ? q.x : q.x - width;
    return { left, right: left + width, top: q.y - LABEL_HEIGHT, bottom: q.y };
  });

  // The points themselves are obstacles: without this a label can land on
  // another server's dot, which reads as a mislabelled point.
  const pointObstacles: Box[] = points.map((p) => {
    const cx = scaleX(p.toolCount);
    const cy = scaleY(p.avgTokensPerTool);
    return {
      left: cx - POINT_R - 1,
      right: cx + POINT_R + 1,
      top: cy - POINT_R - 1,
      bottom: cy + POINT_R + 1,
    };
  });

  const labels = layoutLabels(
    points.map((p) => ({
      id: p.slug,
      x: scaleX(p.toolCount),
      y: scaleY(p.avgTokensPerTool),
      text: p.slug,
    })),
    { minX: PLOT_MIN_X, maxX: PLOT_MAX_X, minY: PLOT_MIN_Y, maxY: PLOT_MAX_Y },
    [...pointObstacles, ...quadrantObstacles],
  );
  const labelById = new Map(labels.map((label) => [label.id, label]));

  const thresholdX = scaleX(TOOL_THRESHOLD);
  const thresholdY = scaleY(TOKEN_THRESHOLD);

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      width="100%"
      role="img"
      aria-label="Scatter plot of tool count against average tokens per tool for every measured server"
    >
      {xTicks.map((tick) => (
        <line
          key={`grid-x-${tick}`}
          x1={scaleX(tick)}
          x2={scaleX(tick)}
          y1={PLOT_MIN_Y}
          y2={PLOT_MAX_Y}
          stroke="var(--muted)"
          strokeOpacity={0.25}
          strokeWidth={0.5}
        />
      ))}
      {yTicks.map((tick) => (
        <line
          key={`grid-y-${tick}`}
          x1={PLOT_MIN_X}
          x2={PLOT_MAX_X}
          y1={scaleY(tick)}
          y2={scaleY(tick)}
          stroke="var(--muted)"
          strokeOpacity={0.25}
          strokeWidth={0.5}
        />
      ))}

      <line
        x1={thresholdX}
        x2={thresholdX}
        y1={PLOT_MIN_Y}
        y2={PLOT_MAX_Y}
        stroke="var(--muted)"
        strokeWidth={0.75}
        strokeDasharray="3 3"
      />
      <line
        x1={PLOT_MIN_X}
        x2={PLOT_MAX_X}
        y1={thresholdY}
        y2={thresholdY}
        stroke="var(--muted)"
        strokeWidth={0.75}
        strokeDasharray="3 3"
      />

      <line
        x1={PLOT_MIN_X}
        x2={PLOT_MAX_X}
        y1={PLOT_MAX_Y}
        y2={PLOT_MAX_Y}
        stroke="var(--muted)"
        strokeWidth={0.75}
      />
      <line
        x1={PLOT_MIN_X}
        x2={PLOT_MIN_X}
        y1={PLOT_MIN_Y}
        y2={PLOT_MAX_Y}
        stroke="var(--muted)"
        strokeWidth={0.75}
      />

      {xTicks.map((tick) => (
        <text
          key={`tick-x-${tick}`}
          x={scaleX(tick)}
          y={PLOT_MAX_Y + 14}
          fontSize={FONT_SIZE}
          textAnchor="middle"
          fill="var(--muted)"
        >
          {tick}
        </text>
      ))}
      {yTicks.map((tick) => (
        <text
          key={`tick-y-${tick}`}
          x={PLOT_MIN_X - 6}
          y={scaleY(tick) + 3.5}
          fontSize={FONT_SIZE}
          textAnchor="end"
          fill="var(--muted)"
        >
          {tick}
        </text>
      ))}

      {quadrantLabels.map((q) => (
        <text
          key={q.text}
          x={q.x}
          y={q.y}
          fontSize={FONT_SIZE}
          fontStyle="italic"
          textAnchor={q.align}
          fill="var(--muted)"
        >
          {q.text}
        </text>
      ))}

      {points.map((point) => {
        const cx = scaleX(point.toolCount);
        const cy = scaleY(point.avgTokensPerTool);
        const label = labelById.get(point.slug);
        return (
          <g key={point.slug}>
            {label?.leaderTo ? (
              <line
                x1={label.leaderTo.x}
                y1={label.leaderTo.y}
                x2={label.x}
                y2={label.y}
                stroke="var(--muted)"
                strokeWidth={0.5}
              />
            ) : null}
            <circle cx={cx} cy={cy} r={POINT_R} fill="var(--measure)" />
            {label ? (
              <text
                x={label.x}
                y={label.y}
                fontSize={FONT_SIZE}
                fontFamily="var(--font-mono)"
                textAnchor={label.anchor}
                fill="var(--ink)"
              >
                {point.slug}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}