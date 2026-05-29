import type { LucideIcon } from "lucide-react";

import { COLORS } from "@/lib/design";

/**
 * An SVG progress ring with a centered icon — the dashboard hero widget.
 * Generic over icon and color so any "track-toward-a-target" habit can use it
 * (water intake, Japanese reviews, …).
 */
export function ProgressRing({
  value,
  max,
  icon: Icon,
  color,
  size = 88,
  stroke = 8,
}: {
  /** Current progress. */
  value: number;
  /** Target. */
  max: number;
  icon: LucideIcon;
  /** Progress arc + icon color (any CSS color). */
  color: string;
  size?: number;
  stroke?: number;
}) {
  const r = size / 2 - stroke / 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={COLORS.divider}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 300ms ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <Icon className="size-7" strokeWidth={1.75} style={{ color }} />
      </div>
    </div>
  );
}
