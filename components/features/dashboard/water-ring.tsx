import { Droplet } from "lucide-react";

import { COLORS, PRIMARY } from "@/lib/design";

/**
 * An 88px SVG ring with a centered droplet — the dashboard water widget.
 * Career-blue progress arc on a divider track.
 */
export function WaterRing({
  value,
  max,
  size = 88,
  stroke = 8,
}: {
  /** Current intake. */
  value: number;
  /** Daily target. */
  max: number;
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
          stroke={PRIMARY}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 300ms ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <Droplet
          className="size-7"
          strokeWidth={1.75}
          style={{ color: PRIMARY }}
        />
      </div>
    </div>
  );
}
