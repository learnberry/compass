interface SparklineProps {
  /** Series of values (any scale). */
  data: number[];
  /** Max value for scaling; defaults to the data max. */
  max?: number;
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

/** A tiny inline trend line, no axes. */
export function Sparkline({
  data,
  max,
  width = 120,
  height = 36,
  color = "var(--primary)",
  className,
}: SparklineProps) {
  if (data.length === 0) {
    return <div style={{ width, height }} className={className} />;
  }

  const ceiling = Math.max(max ?? Math.max(...data), 1);
  const step = data.length > 1 ? width / (data.length - 1) : 0;
  const pad = 2;
  const usable = height - pad * 2;

  const points = data.map((v, i) => {
    const x = data.length > 1 ? i * step : width / 2;
    const y = pad + usable - (Math.min(v, ceiling) / ceiling) * usable;
    return [x, y] as const;
  });

  const line = points.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `0,${height} ${line} ${width},${height}`;
  const last = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
    >
      <polygon points={area} fill={color} fillOpacity={0.12} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill={color} />
    </svg>
  );
}
