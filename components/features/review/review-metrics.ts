/**
 * Pure weekly-review computations over HabitWithStatus.stats.history.
 *
 * Each habit's `stats.history` is a list of {date, value, completed} entries.
 * The Review screen aggregates the current and previous calendar weeks.
 */

import type { Domain, HabitWithStatus } from "@/lib/types";
import { dateRange, shiftDate, weekStart } from "@/lib/dates";
import { domainVisual, type DomainVisual } from "@/lib/design";

/** Set of completed date strings for a habit. */
function completedDates(habit: HabitWithStatus): Set<string> {
  return new Set(
    habit.stats.history.filter((d) => d.completed).map((d) => d.date),
  );
}

/** Count of `days` a habit was completed. */
function completedCount(done: Set<string>, days: string[]): number {
  return days.reduce((n, d) => (done.has(d) ? n + 1 : n), 0);
}

export interface DomainBar {
  visual: DomainVisual;
  /** 0–100 weekly completion. */
  value: number;
}

export interface HabitRow {
  id: string;
  name: string;
  visual: DomainVisual;
  /** 7 booleans, Mon → Sun, for the current week. */
  cells: boolean[];
}

export interface Highlight {
  /** Habit name, or null when there is nothing to show. */
  name: string | null;
  /** Trailing detail, e.g. "128 days". */
  detail: string;
}

export interface ReviewMetrics {
  /** "Mon D – Sun D" label for the current week. */
  weekLabel: string;
  /** This week's overall completion, 0–100. */
  overall: number;
  /** Signed delta vs last week, in percentage points. */
  delta: number;
  /** Per-domain bars, only domains that have habits. */
  domainBars: DomainBar[];
  /** One row per habit for the heatmap grid. */
  habitRows: HabitRow[];
  bestStreak: Highlight;
  mostConsistent: Highlight;
  missedMost: Highlight;
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

/** "May 18 – 24" / "Apr 28 – May 4" from two "YYYY-MM-DD" strings. */
function formatWeekLabel(from: string, to: string): string {
  const [, fM, fD] = from.split("-").map(Number);
  const [, tM, tD] = to.split("-").map(Number);
  const start = `${MONTHS[fM - 1]} ${fD}`;
  const end = fM === tM ? `${tD}` : `${MONTHS[tM - 1]} ${tD}`;
  return `${start} – ${end}`;
}

/** Average of a habit's weekly completion ratios, as a 0–100 percentage. */
function weeklyAverage(habits: HabitWithStatus[], days: string[]): number {
  if (habits.length === 0) return 0;
  const sum = habits.reduce((acc, h) => {
    const done = completedCount(completedDates(h), days);
    return acc + done / days.length;
  }, 0);
  return Math.round((sum / habits.length) * 100);
}

/** Compute every metric the Review screen renders. */
export function computeReviewMetrics(
  habits: HabitWithStatus[],
  domains: Domain[],
  refDate: string,
): ReviewMetrics {
  const thisMonday = weekStart(refDate);
  const thisSunday = shiftDate(thisMonday, 6);
  const lastMonday = shiftDate(thisMonday, -7);
  const lastSunday = shiftDate(thisMonday, -1);

  const thisWeek = dateRange(thisMonday, thisSunday);
  const lastWeek = dateRange(lastMonday, lastSunday);

  const overall = weeklyAverage(habits, thisWeek);
  const delta = overall - weeklyAverage(habits, lastWeek);

  // Per-domain bars — average each domain's habits' current-week completion.
  const domainBars: DomainBar[] = [];
  for (const domain of domains) {
    const members = habits.filter((h) => h.domainId === domain.id);
    if (members.length === 0) continue;
    domainBars.push({
      visual: domainVisual(domain),
      value: weeklyAverage(members, thisWeek),
    });
  }

  // Heatmap rows.
  const domainsById = new Map(domains.map((d) => [d.id, d]));
  const habitRows: HabitRow[] = habits.map((h) => {
    const done = completedDates(h);
    return {
      id: h.id,
      name: h.name,
      visual: domainVisual(h.domainId ? domainsById.get(h.domainId) : null),
      cells: thisWeek.map((d) => done.has(d)),
    };
  });

  // Highlights.
  const bestStreak = pickHighlight(habits, (h) => h.stats.longestStreak, (h) =>
    h.stats.longestStreak > 0
      ? `${h.stats.longestStreak} day${h.stats.longestStreak === 1 ? "" : "s"}`
      : "—",
  );

  const mostConsistent = pickHighlight(
    habits,
    (h) => h.stats.rate7d,
    (h) => {
      const done = completedCount(completedDates(h), thisWeek);
      return `${done}/${thisWeek.length} days`;
    },
  );

  const missedMost = pickHighlight(
    habits,
    (h) => thisWeek.length - completedCount(completedDates(h), thisWeek),
    (h) => {
      const misses = thisWeek.length - completedCount(completedDates(h), thisWeek);
      return `${misses} miss${misses === 1 ? "" : "es"}`;
    },
    /* requirePositive */ true,
  );

  return {
    weekLabel: formatWeekLabel(thisMonday, thisSunday),
    overall,
    delta,
    domainBars,
    habitRows,
    bestStreak,
    mostConsistent,
    missedMost,
  };
}

/** Pick the habit that maximizes `score`; format its detail with `detail`. */
function pickHighlight(
  habits: HabitWithStatus[],
  score: (h: HabitWithStatus) => number,
  detail: (h: HabitWithStatus) => string,
  requirePositive = false,
): Highlight {
  let best: HabitWithStatus | null = null;
  let bestScore = -Infinity;
  for (const h of habits) {
    const s = score(h);
    if (s > bestScore) {
      bestScore = s;
      best = h;
    }
  }
  if (!best || (requirePositive && bestScore <= 0)) {
    return { name: null, detail: "—" };
  }
  return { name: best.name, detail: detail(best) };
}
