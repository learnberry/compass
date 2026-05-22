import { ReviewCard } from "@/components/features/review/review-card";
import { COLORS } from "@/lib/design";
import type { HabitRow } from "@/components/features/review/review-metrics";

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * The "This week" card — a 7-day × N-habit heatmap. A day-header row sits over
 * the columns; each habit row is an 84px name label plus 7 square cells filled
 * in the habit's domain color when that day was completed.
 */
export function WeekGridCard({ rows }: { rows: HabitRow[] }) {
  return (
    <ReviewCard>
      <h2 className="mb-3 text-[13px] font-semibold text-ink">This week</h2>
      <div className="flex flex-col gap-1.5">
        {/* Day header, aligned over the 7 cell columns. */}
        <div className="flex gap-1 pl-[88px]">
          {DAY_LETTERS.map((d, i) => (
            <span
              key={i}
              className="flex-1 text-center text-[10px] font-semibold text-ink-3"
            >
              {d}
            </span>
          ))}
        </div>

        {rows.map((row) => (
          <div key={row.id} className="flex items-center gap-1">
            <span className="w-[84px] truncate text-[11px] font-medium tracking-[-0.1px] text-ink">
              {row.name}
            </span>
            <div className="flex flex-1 gap-1">
              {row.cells.map((on, i) => (
                <div
                  key={i}
                  className="aspect-square flex-1 rounded-[5px]"
                  style={{
                    background: on ? row.visual.solid : COLORS.cellEmpty,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </ReviewCard>
  );
}
