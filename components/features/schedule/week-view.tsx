"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";

import type { TimeBlock } from "@/lib/types";
import { api } from "@/lib/api-client";
import { dateRange, parseDate, todayStr, weekStart } from "@/lib/dates";
import { format } from "date-fns";
import { cn, haptic } from "@/lib/utils";

interface WeekViewProps {
  /** Anchor date — the week containing this date is shown. */
  date: string;
  /** Blocks already loaded for the current date, keyed by that date. */
  knownBlocks: Record<string, TimeBlock[]>;
  /** Jump to the Today tab for the chosen day. */
  onPickDay: (date: string) => void;
}

/** Lightweight 7-day overview — block count per day, tap to drill in. */
export function WeekView({ date, knownBlocks, onPickDay }: WeekViewProps) {
  const days = dateRange(weekStart(date), nextSunday(weekStart(date)));
  const today = todayStr();

  // Per-day block lists, seeded from anything already loaded.
  const [counts, setCounts] = useState<Record<string, TimeBlock[] | null>>(
    () => ({ ...knownBlocks }),
  );

  useEffect(() => {
    let cancelled = false;
    setCounts((prev) => ({ ...knownBlocks, ...prev }));
    for (const d of days) {
      if (counts[d] !== undefined) continue;
      api.timeBlocks
        .list(d)
        .then((blocks) => {
          if (!cancelled) setCounts((c) => ({ ...c, [d]: blocks }));
        })
        .catch(() => {
          if (!cancelled) setCounts((c) => ({ ...c, [d]: [] }));
        });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  return (
    <div className="flex-1 overflow-y-auto px-5 pb-6">
      <div className="overflow-hidden rounded-card border border-hairline bg-surface">
        {days.map((d, i) => {
          const blocks = counts[d];
          const isToday = d === today;
          const dt = parseDate(d);
          return (
            <button
              key={d}
              type="button"
              onClick={() => {
                haptic(8);
                onPickDay(d);
              }}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-divider/60",
                i > 0 && "border-t border-divider",
              )}
            >
              {/* Date chip */}
              <div
                className={cn(
                  "flex size-11 shrink-0 flex-col items-center justify-center rounded-tile",
                  isToday
                    ? "bg-career text-white"
                    : "bg-divider text-ink",
                )}
              >
                <span
                  className={cn(
                    "text-[9px] font-semibold uppercase tracking-wide",
                    isToday ? "text-white/80" : "text-ink-3",
                  )}
                >
                  {format(dt, "EEE")}
                </span>
                <span className="text-[15px] font-bold leading-none tnum">
                  {format(dt, "d")}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold tracking-[-0.1px] text-ink">
                  {format(dt, "EEEE")}
                  {isToday && (
                    <span className="ml-1.5 text-[11px] font-semibold text-career">
                      Today
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-[12px] font-medium text-ink-2">
                  {!blocks
                    ? "Loading…"
                    : blocks.length === 0
                      ? "No blocks"
                      : `${blocks.length} block${blocks.length === 1 ? "" : "s"}`}
                </p>
              </div>

              {/* Domain swatches preview */}
              {blocks && blocks.length > 0 && (
                <div className="flex shrink-0 -space-x-1">
                  {blocks.slice(0, 5).map((b) => (
                    <span
                      key={b.id}
                      className="size-2.5 rounded-full ring-2 ring-surface"
                      style={{ background: b.color }}
                    />
                  ))}
                </div>
              )}

              <ChevronRight className="size-4 shrink-0 text-ink-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** The Sunday that ends the week starting on the given Monday. */
function nextSunday(mondayStr: string): string {
  const d = parseDate(mondayStr);
  d.setDate(d.getDate() + 6);
  return format(d, "yyyy-MM-dd");
}
