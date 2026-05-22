import { ReviewCard } from "@/components/features/review/review-card";
import type { DomainBar } from "@/components/features/review/review-metrics";

/**
 * The "By domain" card — one horizontal bar per domain that has habits:
 * a 78px label column, a 14px track filled to the domain's weekly
 * completion, and a 30px right column with the percentage.
 */
export function DomainBarsCard({ bars }: { bars: DomainBar[] }) {
  return (
    <ReviewCard>
      <h2 className="mb-3.5 text-[13px] font-semibold text-ink">By domain</h2>
      <div className="flex flex-col gap-[11px]">
        {bars.map(({ visual, value }) => (
          <div key={visual.key} className="flex items-center gap-2.5">
            <span className="w-[78px] text-xs font-medium text-ink">
              {visual.name}
            </span>
            <div className="h-3.5 flex-1 overflow-hidden rounded-[7px] bg-divider">
              <div
                className="h-full rounded-[7px]"
                style={{ width: `${value}%`, background: visual.solid }}
              />
            </div>
            <span className="w-[30px] text-right text-xs font-semibold text-ink tnum">
              {value}%
            </span>
          </div>
        ))}
      </div>
    </ReviewCard>
  );
}
