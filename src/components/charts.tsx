import { formatMoney } from "@/lib/format";
import type { DonutSegment, MonthlyPoint } from "@/lib/charts";

export const DONUT_COLORS = [
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#65a30d",
  "#ea580c",
  "#0d9488",
  "#9333ea",
  "#475569",
];

export function TrendBars({
  points,
  currency,
}: {
  points: MonthlyPoint[];
  currency: string;
}) {
  const max = Math.max(...points.map((point) => point.cents), 1);

  return (
    <div className="flex items-end justify-between gap-2 pt-4">
      {points.map((point) => {
        const height = Math.max((point.cents / max) * 96, point.cents > 0 ? 4 : 2);
        return (
          <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
            <svg
              width="100%"
              height="100"
              viewBox="0 0 32 100"
              preserveAspectRatio="none"
              className="w-full"
              role="img"
              aria-label={`${point.label}: ${formatMoney(point.cents, currency)}`}
            >
              <title>{`${point.label}: ${formatMoney(point.cents, currency)}`}</title>
              <rect
                x="4"
                y={100 - height}
                width="24"
                height={height}
                rx="4"
                fill={point.cents > 0 ? "hsl(var(--primary))" : "hsl(var(--muted))"}
                opacity={point.cents > 0 ? 1 : 0.6}
              />
            </svg>
            <span className="text-xs text-muted-foreground">{point.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function CategoryDonut({
  segments,
  currency,
}: {
  segments: (DonutSegment & { label: string; emoji: string })[];
  currency: string;
}) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, segment) => sum + segment.cents, 0);

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg
        viewBox="0 0 120 120"
        className="size-36 -rotate-90"
        role="img"
        aria-label="Spending by category"
      >
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="16"
        />
        {segments.map((segment, index) => (
          <circle
            key={segment.key}
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={DONUT_COLORS[index % DONUT_COLORS.length]}
            strokeWidth="16"
            strokeDasharray={`${segment.fraction * circumference} ${circumference}`}
            strokeDashoffset={-segment.offsetFraction * circumference}
          >
            <title>{`${segment.label}: ${formatMoney(segment.cents, currency)}`}</title>
          </circle>
        ))}
      </svg>
      <ul className="min-w-40 flex-1 space-y-2">
        {segments.map((segment, index) => (
          <li key={segment.key} className="flex items-center gap-2 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{
                backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length],
              }}
            />
            <span className="flex-1 truncate">
              {segment.emoji} {segment.label}
            </span>
            <span className="text-muted-foreground">
              {Math.round(segment.fraction * 100)}%
            </span>
            <span className="font-medium">
              {formatMoney(segment.cents, currency)}
            </span>
          </li>
        ))}
      </ul>
      <p className="sr-only">Total {formatMoney(total, currency)}</p>
    </div>
  );
}
