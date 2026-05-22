import { heatmapColor } from "@/lib/design";
import { parseDate } from "@/lib/dates";

/** A single day in the heatmap: a date and a 0–4 intensity level. */
export interface HeatmapDay {
  date: string;
  /** 0 = not completed, 1–4 = increasing intensity. */
  level: number;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * GitHub-style contribution grid — 7 rows (Mon→Sun) × N week columns.
 * `days` must be a contiguous run of dates, oldest first.
 */
export function HabitHeatmap({
  days,
  solid,
}: {
  days: HeatmapDay[];
  solid: string;
}) {
  if (days.length === 0) return null;

  // Pad the front so column 0 starts on a Monday (getDay: 0=Sun … 6=Sat).
  const firstDow = parseDate(days[0].date).getDay();
  const leadPad = (firstDow + 6) % 7; // Mon=0 … Sun=6

  const cells: (HeatmapDay | null)[] = [
    ...Array.from({ length: leadPad }, () => null),
    ...days,
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (HeatmapDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  // Month label per column — shown when a column introduces a new month.
  const monthLabels = weeks.map((week, ci) => {
    const firstReal = week.find((c): c is HeatmapDay => c != null);
    if (!firstReal) return "";
    const month = parseDate(firstReal.date).getMonth();
    if (ci === 0) return MONTHS[month];
    const prev = weeks[ci - 1].find((c): c is HeatmapDay => c != null);
    if (prev && parseDate(prev.date).getMonth() === month) return "";
    return MONTHS[month];
  });

  return (
    <div>
      {/* Month labels */}
      <div className="mb-1 ml-[18px] flex gap-[3px]">
        {monthLabels.map((label, i) => (
          <div
            key={i}
            className="flex-1 text-[9px] font-medium text-ink-2"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="flex gap-1">
        {/* Weekday rail — M / W / F */}
        <div className="flex flex-col justify-between">
          {["M", "", "W", "", "F", "", ""].map((d, i) => (
            <div
              key={i}
              className="h-[13px] w-3 text-[8px] leading-[13px] text-ink-2"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Week columns */}
        <div className="flex flex-1 gap-[3px]">
          {weeks.map((week, ci) => (
            <div key={ci} className="flex flex-1 flex-col gap-[3px]">
              {week.map((cell, ri) => (
                <div
                  key={ri}
                  className="h-[13px] rounded-[3px]"
                  style={{
                    background: cell
                      ? heatmapColor(solid, cell.level)
                      : "transparent",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-2.5 flex items-center justify-end gap-1.5 text-[10px] text-ink-2">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <span
            key={level}
            className="size-[10px] rounded-[2px]"
            style={{ background: heatmapColor(solid, level) }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
