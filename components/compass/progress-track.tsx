import { PRIMARY } from "@/lib/design";
import { cn } from "@/lib/utils";

/** Thin rounded progress bar on a divider-colored track. */
export function ProgressTrack({
  value,
  color = PRIMARY,
  height = 6,
  trackColor,
  className,
}: {
  /** 0–100. */
  value: number;
  color?: string;
  height?: number;
  trackColor?: string;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cn("overflow-hidden rounded-full bg-divider", className)}
      style={{ height, ...(trackColor ? { background: trackColor } : null) }}
    >
      <div
        className="h-full rounded-full transition-[width] duration-300 ease-out"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}
