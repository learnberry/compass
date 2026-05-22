import { lastNDays, weekdayOf } from "@/lib/dates";
import { cn } from "@/lib/utils";

interface HeatmapCell {
  date: string;
  /** 0-1 completion intensity. */
  intensity: number;
}

interface HeatmapProps {
  /** Map of "YYYY-MM-DD" -> 0-1 intensity. */
  values: Record<string, number>;
  /** Number of weeks to render (columns). */
  weeks?: number;
  /** Accent color for filled cells. */
  color?: string;
  /** Reference end date (defaults to today). */
  end?: string;
  className?: string;
}

const DAY_LABELS = ["", "M", "", "W", "", "F", ""] as const;

/** GitHub-style contribution heatmap, color-graded by completion intensity. */
export function Heatmap({
  values,
  weeks = 17,
  color = "var(--primary)",
  end,
  className,
}: HeatmapProps) {
  const totalDays = weeks * 7;
  // Pad the start so the grid begins on a Monday column.
  const days = lastNDays(totalDays, end);
  const firstDow = weekdayOf(days[0]); // 0=Sun..6=Sat
  const leadPad = (firstDow + 6) % 7; // days before first Monday

  const cells: (HeatmapCell | null)[] = [
    ...Array.from({ length: leadPad }, () => null),
    ...days.map((date) => ({ date, intensity: values[date] ?? 0 })),
  ];

  // Group into weeks of 7 (columns).
  const columns: (HeatmapCell | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    columns.push(cells.slice(i, i + 7));
  }

  return (
    <div className={cn("flex gap-[3px]", className)}>
      <div className="mr-1 flex flex-col gap-[3px] pt-[1px]">
        {DAY_LABELS.map((label, i) => (
          <span
            key={i}
            className="h-[11px] text-[0.55rem] leading-[11px] text-muted-foreground"
          >
            {label}
          </span>
        ))}
      </div>
      {columns.map((week, ci) => (
        <div key={ci} className="flex flex-col gap-[3px]">
          {week.map((cell, ri) => {
            if (!cell) {
              return <div key={ri} className="size-[11px]" />;
            }
            const filled = cell.intensity > 0;
            // Quantize intensity into 4 buckets for opacity.
            const bucket =
              cell.intensity >= 1
                ? 1
                : cell.intensity >= 0.66
                  ? 0.7
                  : cell.intensity >= 0.33
                    ? 0.45
                    : cell.intensity > 0
                      ? 0.25
                      : 0;
            return (
              <div
                key={ri}
                title={`${cell.date}`}
                className={cn(
                  "size-[11px] rounded-[3px]",
                  !filled && "bg-secondary",
                )}
                style={
                  filled
                    ? { backgroundColor: color, opacity: bucket }
                    : undefined
                }
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
