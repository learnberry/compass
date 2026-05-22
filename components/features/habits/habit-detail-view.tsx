"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, MoreHorizontal } from "lucide-react";

import { CircleButton } from "@/components/compass/circle-button";
import { DomainTile } from "@/components/compass/domain-tile";
import { ProgressTrack } from "@/components/compass/progress-track";
import { HabitDialog } from "@/components/features/habits/habit-dialog";
import {
  HabitHeatmap,
  type HeatmapDay,
} from "@/components/features/habits/habit-heatmap";
import { COLORS, domainVisual, iconByName } from "@/lib/design";
import type { Domain, Habit, HabitStats } from "@/lib/types";
import { frequencyLabel } from "@/lib/hooks/habit-helpers";
import { parseDate } from "@/lib/dates";
import { format } from "date-fns";

interface HabitDetailViewProps {
  habit: Habit;
  domain: Domain | undefined;
  stats: HabitStats;
  domains: Domain[];
}

const HEATMAP_DAYS = 91; // 13 weeks

/** The Habit detail screen — header, streaks, heatmap and completion rates. */
export function HabitDetailView({
  habit,
  domain,
  stats,
  domains,
}: HabitDetailViewProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  const visual = domainVisual(domain);
  const Icon = iconByName(habit.icon);

  const target =
    habit.targetValue > 1 || habit.unit
      ? `${habit.targetValue}${habit.unit ? ` ${habit.unit}` : ""}`
      : "Once";
  const meta = `${visual.name} · ${target} · ${frequencyLabel(
    habit.frequencyType,
    habit.frequencyConfig,
  )}`;

  const totalDays = useMemo(
    () => stats.history.filter((d) => d.completed).length,
    [stats.history],
  );

  // The most recent HEATMAP_DAYS days, mapped to 0–4 intensity levels.
  const heatmapDays = useMemo<HeatmapDay[]>(() => {
    const recent = stats.history.slice(-HEATMAP_DAYS);
    return recent.map((d) => {
      let level = 0;
      if (d.completed) {
        level = 4;
      } else if (habit.targetValue > 1 && d.value > 0) {
        // Partial progress on a quantitative habit → graded fill.
        const ratio = d.value / habit.targetValue;
        level = Math.min(3, Math.max(1, Math.ceil(ratio * 4)));
      }
      return { date: d.date, level };
    });
  }, [stats.history, habit.targetValue]);

  const dateRange = useMemo(() => {
    if (heatmapDays.length === 0) return "";
    const start = parseDate(heatmapDays[0].date);
    const end = parseDate(heatmapDays[heatmapDays.length - 1].date);
    return `${format(start, "MMM d")} – ${format(end, "MMM d")}`;
  }, [heatmapDays]);

  const rateRows = [
    { label: "Last 7 days", rate: stats.rate7d, window: 7 },
    { label: "Last 30 days", rate: stats.rate30d, window: 30 },
    {
      label: "All-time",
      rate: stats.rateAllTime,
      window: stats.history.length,
    },
  ];

  return (
    <div className="flex flex-1 flex-col pt-safe">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-hairline bg-canvas/95 px-5 py-2 backdrop-blur">
        <CircleButton aria-label="Back" onClick={() => router.back()}>
          <ChevronLeft className="size-[18px]" strokeWidth={1.75} />
        </CircleButton>
        <h1 className="text-[14px] font-semibold text-ink">Habit detail</h1>
        <CircleButton aria-label="More options">
          <MoreHorizontal className="size-[18px]" strokeWidth={1.75} />
        </CircleButton>
      </header>

      <div className="flex flex-col px-5 pb-[96px] pt-2">
        {/* Header card */}
        <div className="mb-[18px] flex items-center gap-3.5">
          <DomainTile
            icon={Icon}
            solid={visual.solid}
            tint={visual.tint}
            size={56}
            radius={16}
            iconSize={28}
          />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[20px] font-bold tracking-[-0.4px] text-ink">
              {habit.name}
            </h2>
            <p className="mt-0.5 truncate text-xs font-medium text-ink-2">
              {meta}
            </p>
          </div>
        </div>

        {/* Streak stats */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          <StatBig
            label="Current"
            value={stats.currentStreak}
            color={visual.solid}
          />
          <StatBig label="Best" value={stats.longestStreak} />
          <StatBig label="Total" value={totalDays} />
        </div>

        {/* Heatmap card */}
        <div className="mb-3.5 rounded-card border border-hairline bg-surface p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="text-[13px] font-semibold text-ink">
              Last 90 days
            </h3>
            <span className="text-[11px] font-medium text-ink-2 tnum">
              {dateRange}
            </span>
          </div>
          <HabitHeatmap days={heatmapDays} solid={visual.solid} />
        </div>

        {/* Completion rate card */}
        <div className="mb-3.5 rounded-card border border-hairline bg-surface p-4">
          <h3 className="mb-3 text-[13px] font-semibold text-ink">
            Completion rate
          </h3>
          <div className="space-y-3">
            {rateRows.map((row) => {
              const pct = Math.round(row.rate * 100);
              const done = Math.round(row.rate * row.window);
              return (
                <div key={row.label}>
                  <div className="mb-1.5 flex items-baseline justify-between text-xs">
                    <span className="font-medium text-ink-2">
                      {row.label}
                    </span>
                    <span className="font-semibold text-ink tnum">
                      {pct}%{" "}
                      <span className="font-medium text-ink-3">
                        · {done}/{row.window}
                      </span>
                    </span>
                  </div>
                  <ProgressTrack value={pct} color={visual.solid} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Edit habit */}
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="w-full rounded-btn border border-hairline bg-surface px-4 py-3 text-[14px] font-semibold text-ink transition-transform active:scale-[0.99]"
        >
          Edit habit
        </button>
      </div>

      <HabitDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        habit={habit}
        domains={domains}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}

/** A bordered streak stat tile — label over a big tabular number + "d". */
function StatBig({
  label,
  value,
  color = COLORS.ink,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="rounded-[14px] border border-hairline bg-surface px-3 pb-[11px] pt-3">
      <div className="text-[11px] font-semibold text-ink-2">{label}</div>
      <div className="mt-1 flex items-baseline gap-0.5">
        <span
          className="text-[22px] font-bold leading-none tracking-[-0.5px] tnum"
          style={{ color }}
        >
          {value}
        </span>
        <span className="text-xs font-semibold text-ink-2">d</span>
      </div>
    </div>
  );
}
