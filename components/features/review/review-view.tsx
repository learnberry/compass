import { Calendar } from "lucide-react";

import { DomainBarsCard } from "@/components/features/review/domain-bars-card";
import { HighlightsCard } from "@/components/features/review/highlights-card";
import { OverallCard } from "@/components/features/review/overall-card";
import { WeekGridCard } from "@/components/features/review/week-grid-card";
import { computeReviewMetrics } from "@/components/features/review/review-metrics";
import type { Domain, HabitWithStatus } from "@/lib/types";
import { todayStr } from "@/lib/dates";

interface ReviewViewProps {
  habits: HabitWithStatus[];
  domains: Domain[];
}

/** The Review screen — weekly insights across habits and domains. */
export function ReviewView({ habits, domains }: ReviewViewProps) {
  const m = computeReviewMetrics(habits, domains, todayStr());

  return (
    <div className="flex flex-1 flex-col pt-safe">
      {/* Header */}
      <header className="px-5 pt-2">
        <h1 className="text-[26px] font-bold tracking-[-0.5px] text-ink">
          Review
        </h1>
        <div className="mt-1 flex items-center gap-2">
          <Calendar className="size-3.5 text-ink-2" strokeWidth={1.75} />
          <p className="text-[13px] font-medium text-ink-2">
            Week of {m.weekLabel}
          </p>
        </div>
      </header>

      {/* Scroll content */}
      <div className="flex flex-col gap-3.5 px-5 pb-[96px] pt-3.5">
        <OverallCard overall={m.overall} delta={m.delta} />

        {m.domainBars.length > 0 && <DomainBarsCard bars={m.domainBars} />}

        {m.habitRows.length > 0 && <WeekGridCard rows={m.habitRows} />}

        {habits.length === 0 ? (
          <div className="rounded-card border border-dashed border-hairline bg-surface px-6 py-12 text-center">
            <p className="text-[13px] font-medium text-ink-2">
              No habits yet — add some to see your weekly review.
            </p>
          </div>
        ) : (
          <HighlightsCard
            bestStreak={m.bestStreak}
            mostConsistent={m.mostConsistent}
            missedMost={m.missedMost}
          />
        )}
      </div>
    </div>
  );
}
