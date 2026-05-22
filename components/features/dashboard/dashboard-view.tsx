"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Flame, Minus, Plus } from "lucide-react";
import { toast } from "sonner";

import { MetricTile } from "@/components/compass/metric-tile";
import { SectionHeader } from "@/components/compass/section-header";
import { GoalRow } from "@/components/features/dashboard/goal-row";
import { HabitRow } from "@/components/features/dashboard/habit-row";
import { NowNextCard } from "@/components/features/dashboard/now-next-card";
import { WaterRing } from "@/components/features/dashboard/water-ring";
import { WeekSparkline } from "@/components/features/dashboard/week-sparkline";
import { api } from "@/lib/api-client";
import {
  clockToMinutes,
  format,
  lastNDays,
  longDate,
  nowClock,
  parseDate,
  todayStr,
} from "@/lib/dates";
import { ALERT, COLORS, PRIMARY } from "@/lib/design";
import type {
  AppSettings,
  Domain,
  Goal,
  HabitWithStatus,
  TimeBlock,
} from "@/lib/types";
import { clamp, haptic, percent, round } from "@/lib/utils";

interface DashboardViewProps {
  initialHabits: HabitWithStatus[];
  initialDomains: Domain[];
  initialBlocks: TimeBlock[];
  initialGoals: Goal[];
  initialSettings: AppSettings;
}

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
/** Water step in litres (+250 ml). */
const WATER_STEP = 0.25;

/** Greeting that varies by the local hour. */
function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Home — the daily dashboard. */
export function DashboardView({
  initialHabits,
  initialDomains,
  initialBlocks,
  initialGoals,
  initialSettings,
}: DashboardViewProps) {
  const [habits, setHabits] = useState(initialHabits);
  const [dueReminders, setDueReminders] = useState(0);
  const [nowMinutes, setNowMinutes] = useState(() =>
    clockToMinutes(nowClock()),
  );

  const domainsById = useMemo(() => {
    const m = new Map<string, Domain>();
    for (const d of initialDomains) m.set(d.id, d);
    return m;
  }, [initialDomains]);

  // Tick the Now-block progress every minute.
  useEffect(() => {
    const tick = () => setNowMinutes(clockToMinutes(nowClock()));
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Fetch the due-reminder count for the bell badge.
  useEffect(() => {
    let cancelled = false;
    api.reminders
      .due()
      .then((reminders) => {
        if (!cancelled) setDueReminders(reminders.length);
      })
      .catch(() => {
        /* badge stays hidden */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshHabits = useCallback(async () => {
    try {
      const next = await api.habits.status(todayStr());
      setHabits(next);
    } catch {
      /* keep optimistic state */
    }
  }, []);

  // ─── Derived metrics ──────────────────────────────────────────────
  const dueHabits = useMemo(() => habits.filter((h) => h.dueToday), [habits]);
  const completedCount = dueHabits.filter((h) => h.doneToday).length;
  const totalCount = dueHabits.length;
  const completionPct = percent(completedCount, totalCount);

  const bestStreak = useMemo(
    () =>
      habits.reduce((max, h) => Math.max(max, h.stats.currentStreak), 0),
    [habits],
  );

  const greeting = useMemo(
    () => greetingForHour(new Date().getHours()),
    [],
  );

  // ─── Now / next blocks ────────────────────────────────────────────
  const { current, next } = useMemo(() => {
    const sorted = [...initialBlocks].sort(
      (a, b) => clockToMinutes(a.startTime) - clockToMinutes(b.startTime),
    );
    let cur: TimeBlock | null = null;
    let nxt: TimeBlock | null = null;
    for (const b of sorted) {
      const start = clockToMinutes(b.startTime);
      const end = clockToMinutes(b.endTime);
      if (nowMinutes >= start && nowMinutes < end) cur = b;
      else if (start > nowMinutes && !nxt) nxt = b;
    }
    return { current: cur, next: nxt };
  }, [initialBlocks, nowMinutes]);

  // ─── Water ───────────────────────────────────────────────────────
  const waterHabit = initialSettings.waterHabitId
    ? habits.find((h) => h.id === initialSettings.waterHabitId)
    : undefined;
  const waterValue = waterHabit?.todayLog?.value ?? 0;
  const waterMax = waterHabit?.targetValue ?? 3;

  // ─── Goals ───────────────────────────────────────────────────────
  const topGoals = useMemo(() => initialGoals.slice(0, 3), [initialGoals]);

  // ─── Weekly completion ───────────────────────────────────────────
  const week = useMemo(() => {
    const days = lastNDays(7);
    const series = days.map((date) => {
      let total = 0;
      let done = 0;
      for (const h of initialHabits) {
        const cell = h.stats.history.find((x) => x.date === date);
        if (!cell) continue;
        total += 1;
        if (cell.completed) done += 1;
      }
      return percent(done, total);
    });
    const labels = days.map((d) => DAY_LETTERS[parseDate(d).getDay()]);
    const avg =
      series.length > 0
        ? Math.round(series.reduce((s, v) => s + v, 0) / series.length)
        : 0;
    return { series, labels, avg, todayIndex: days.length - 1 };
  }, [initialHabits]);

  // ─── Mutations ───────────────────────────────────────────────────
  const toggleHabit = useCallback(
    async (habit: HabitWithStatus) => {
      haptic(habit.doneToday ? 8 : 12);
      const nextValue = habit.doneToday ? 0 : Math.max(1, habit.targetValue);
      const nextDone = !habit.doneToday;

      setHabits((prev) =>
        prev.map((h) =>
          h.id === habit.id
            ? {
                ...h,
                doneToday: nextDone,
                todayLog: {
                  id: h.todayLog?.id ?? `optimistic-${h.id}`,
                  habitId: h.id,
                  date: todayStr(),
                  value: nextValue,
                  completed: nextDone,
                  note: h.todayLog?.note ?? null,
                  createdAt: h.todayLog?.createdAt ?? new Date().toISOString(),
                },
              }
            : h,
        ),
      );

      try {
        await api.habitLogs.upsert({
          habitId: habit.id,
          date: todayStr(),
          value: nextValue,
          completed: nextDone,
          note: habit.todayLog?.note ?? null,
        });
        await refreshHabits();
      } catch {
        toast.error("Couldn't update habit");
        await refreshHabits();
      }
    },
    [refreshHabits],
  );

  const adjustWater = useCallback(
    async (delta: number) => {
      if (!waterHabit) return;
      haptic(delta > 0 ? 12 : 8);
      const nextValue = round(clamp(waterValue + delta, 0, 5), 2);

      setHabits((prev) =>
        prev.map((h) =>
          h.id === waterHabit.id
            ? {
                ...h,
                doneToday: nextValue >= h.targetValue,
                todayLog: {
                  id: h.todayLog?.id ?? `optimistic-${h.id}`,
                  habitId: h.id,
                  date: todayStr(),
                  value: nextValue,
                  completed: nextValue >= h.targetValue,
                  note: h.todayLog?.note ?? null,
                  createdAt: h.todayLog?.createdAt ?? new Date().toISOString(),
                },
              }
            : h,
        ),
      );

      try {
        await api.habitLogs.upsert({
          habitId: waterHabit.id,
          date: todayStr(),
          value: nextValue,
          completed: nextValue >= waterHabit.targetValue,
          note: waterHabit.todayLog?.note ?? null,
        });
        await refreshHabits();
      } catch {
        toast.error("Couldn't save water intake");
        await refreshHabits();
      }
    },
    [waterHabit, waterValue, refreshHabits],
  );

  return (
    <div className="pt-safe">
      <div className="px-5 pb-[96px] pt-2">
        {/* ─── Greeting ─── */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[13px] font-medium tracking-[0.2px] text-ink-2">
              {longDate()}
            </div>
            <h1 className="mt-0.5 text-[26px] font-bold tracking-[-0.5px] text-ink">
              {greeting}
            </h1>
          </div>
          <Link
            href="/reminders"
            aria-label="Reminders"
            className="relative flex size-11 shrink-0 items-center justify-center rounded-full border border-hairline bg-surface text-ink-2 transition-transform active:scale-95"
          >
            <Bell className="size-5" strokeWidth={1.75} />
            {dueReminders > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-[9px] border-2 border-white bg-health px-1 text-[10px] font-bold leading-none text-white tnum">
                {dueReminders > 99 ? "99+" : dueReminders}
              </span>
            )}
          </Link>
        </div>

        {/* ─── 3-up metric row ─── */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          <MetricTile
            label="Today"
            value={`${completionPct}%`}
            accent={PRIMARY}
          />
          <MetricTile
            label="Streak"
            value={bestStreak}
            suffix="d"
            accent={ALERT}
            icon={
              <Flame
                className="size-3"
                strokeWidth={2}
                style={{ color: ALERT }}
              />
            }
          />
          <MetricTile
            label="Remaining"
            value={`${completedCount}/${totalCount}`}
            accent={COLORS.ink}
          />
        </div>

        {/* ─── Water ring ─── */}
        {waterHabit && (
          <div className="mb-4 rounded-card border border-hairline bg-surface p-[18px]">
            <div className="flex items-center gap-[18px]">
              <WaterRing value={waterValue} max={waterMax} />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-ink-2">
                  Water intake
                </div>
                <div className="mt-0.5 text-[22px] font-bold tracking-[-0.4px] text-ink tnum">
                  {waterValue.toFixed(1)}
                  <span className="text-sm font-medium text-ink-2">
                    {" "}
                    / {waterMax.toFixed(1)} {waterHabit.unit || "L"}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => adjustWater(-WATER_STEP)}
                    disabled={waterValue <= 0}
                    aria-label="Less water"
                    className="flex size-8 items-center justify-center rounded-full border border-hairline bg-surface text-ink transition-transform active:scale-90 disabled:opacity-40"
                  >
                    <Minus className="size-4" strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustWater(WATER_STEP)}
                    disabled={waterValue >= 5}
                    aria-label="More water"
                    className="flex size-8 items-center justify-center rounded-full border border-hairline bg-surface text-ink transition-transform active:scale-90 disabled:opacity-40"
                  >
                    <Plus className="size-4" strokeWidth={2} />
                  </button>
                  <span className="ml-1.5 text-xs font-medium text-ink-3">
                    +250 ml
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Today's habits ─── */}
        <SectionHeader
          title="Today's habits"
          trail={`${completedCount}/${totalCount}`}
        />
        <div className="mb-4 overflow-hidden rounded-card border border-hairline bg-surface">
          {dueHabits.length === 0 ? (
            <p className="px-3.5 py-6 text-center text-sm text-ink-3">
              No habits scheduled for today.
            </p>
          ) : (
            dueHabits.map((h, i) => (
              <HabitRow
                key={h.id}
                habit={h}
                domain={h.domainId ? domainsById.get(h.domainId) : undefined}
                last={i === dueHabits.length - 1}
                onToggle={() => toggleHabit(h)}
              />
            ))
          )}
        </div>

        {/* ─── Now & next ─── */}
        <SectionHeader title="Now & next" />
        <div className="mb-4">
          <NowNextCard current={current} next={next} nowMinutes={nowMinutes} />
        </div>

        {/* ─── Today's goals ─── */}
        <SectionHeader title="Today's goals" />
        <div className="mb-4 rounded-card border border-hairline bg-surface px-4 pb-1.5 pt-4">
          {topGoals.length === 0 ? (
            <p className="pb-3 text-center text-sm text-ink-3">
              No active goals yet.
            </p>
          ) : (
            topGoals.map((g, i) => (
              <GoalRow
                key={g.id}
                title={g.title}
                progress={g.progress ?? 0}
                due={
                  g.targetDate
                    ? format(parseDate(g.targetDate), "MMM d")
                    : null
                }
                domain={g.domainId ? domainsById.get(g.domainId) : undefined}
                last={i === topGoals.length - 1}
              />
            ))
          )}
        </div>

        {/* ─── This week ─── */}
        <SectionHeader title="This week" />
        <div className="rounded-card border border-hairline bg-surface p-3.5">
          <div className="mb-2.5 flex items-baseline justify-between">
            <div className="text-[13px] text-ink-2">Completion</div>
            <div className="text-[20px] font-bold tracking-[-0.3px] text-ink tnum">
              {week.avg}
              <span className="text-[13px] font-medium text-ink-2">
                % avg
              </span>
            </div>
          </div>
          <WeekSparkline
            data={week.series}
            labels={week.labels}
            todayIndex={week.todayIndex}
          />
        </div>
      </div>
    </div>
  );
}
