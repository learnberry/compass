import { ReviewCard } from "@/components/features/review/review-card";

/**
 * The "Overall" card — this week's average completion as a hero number, with
 * the week-over-week delta in the top-right (green when up, ink-2 when down).
 */
export function OverallCard({
  overall,
  delta,
}: {
  /** This week's completion, 0–100. */
  overall: number;
  /** Signed delta vs last week, in percentage points. */
  delta: number;
}) {
  const up = delta >= 0;
  const arrow = up ? "↑" : "↓";

  return (
    <ReviewCard>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs font-semibold text-ink-2">Overall</span>
        <span
          className={
            up
              ? "text-[11px] font-semibold text-creative"
              : "text-[11px] font-semibold text-ink-2"
          }
        >
          {arrow} {Math.abs(delta)}% vs last week
        </span>
      </div>
      <div className="text-[36px] font-bold leading-none tracking-[-1px] text-ink tnum">
        {overall}
        <span className="text-[18px] font-semibold text-ink-2">%</span>
      </div>
    </ReviewCard>
  );
}
