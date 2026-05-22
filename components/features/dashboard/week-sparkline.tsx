import { PRIMARY } from "@/lib/design";
import { cn } from "@/lib/utils";

/** 7-bar vertical completion chart with day-letter labels under each bar. */
export function WeekSparkline({
  data,
  labels,
  todayIndex,
}: {
  /** Seven completion percentages, 0–100, oldest first. */
  data: number[];
  /** Seven single-letter day labels. */
  labels: string[];
  /** Index of today's bar — highlighted in career blue. */
  todayIndex: number;
}) {
  const max = Math.max(1, ...data);
  return (
    <div className="flex h-[70px] items-end gap-2">
      {data.map((value, i) => {
        const isToday = i === todayIndex;
        return (
          <div
            key={i}
            className="flex flex-1 flex-col items-center gap-1.5"
          >
            <div
              className="w-full rounded-md"
              style={{
                height: `${Math.max(2, (value / max) * 52)}px`,
                background: isToday ? PRIMARY : "#DADCE0",
              }}
            />
            <div
              className={cn(
                "text-[10px]",
                isToday ? "font-bold text-career" : "font-medium text-ink-3",
              )}
            >
              {labels[i]}
            </div>
          </div>
        );
      })}
    </div>
  );
}
