/**
 * Compass domain types.
 *
 * These are database-agnostic. The repository interface (lib/db/repository.ts)
 * speaks only in terms of these types, so swapping SQLite for Supabase never
 * changes anything a route handler or component imports.
 *
 * Dates are stored as strings:
 *   - calendar dates  -> "YYYY-MM-DD"
 *   - clock times     -> "HH:MM" (24h)
 *   - timestamps      -> ISO 8601 ("YYYY-MM-DDTHH:MM:SS.sssZ")
 */

// ─── Enums ─────────────────────────────────────────────────────────────

export const GOAL_LEVELS = ["life", "yearly", "monthly", "daily"] as const;
export type GoalLevel = (typeof GOAL_LEVELS)[number];

export const GOAL_STATUSES = ["active", "done", "archived"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export const HABIT_FREQUENCY_TYPES = ["daily", "weekly_count", "specific_days"] as const;
export type HabitFrequencyType = (typeof HABIT_FREQUENCY_TYPES)[number];

export const REMINDER_TYPES = ["habit", "custom"] as const;
export type ReminderType = (typeof REMINDER_TYPES)[number];

export const THEMES = ["dark", "light", "system"] as const;
export type Theme = (typeof THEMES)[number];

export const HEALTH_METRICS = ["sleep", "weight", "steps", "resting_hr"] as const;
export type HealthMetricKind = (typeof HEALTH_METRICS)[number];

// ─── Domain (life area / tag) ──────────────────────────────────────────

export interface Domain {
  id: string;
  name: string;
  /** Hex color, e.g. "#22c55e". */
  color: string;
  /** lucide-react icon name, e.g. "HeartPulse". */
  icon: string;
  sortOrder: number;
  createdAt: string;
}

// ─── Goals (life -> yearly -> monthly -> daily) ────────────────────────

export interface Goal {
  id: string;
  level: GoalLevel;
  title: string;
  description: string | null;
  /** Parent goal one level up. Null only for `level: "life"`. */
  parentId: string | null;
  domainId: string | null;
  /** Target completion date, "YYYY-MM-DD". */
  targetDate: string | null;
  status: GoalStatus;
  /**
   * Manual progress override, 0-100. When null, progress is rolled up from
   * child goals (and is computed on read, never persisted).
   */
  progress: number | null;
  sortOrder: number;
  createdAt: string;
}

/** A goal with its computed rollup progress and (optionally) nested children. */
export interface GoalWithProgress extends Goal {
  /** 0-100. Manual override when set, otherwise the average of children. */
  computedProgress: number;
  children: GoalWithProgress[];
}

// ─── Habits ────────────────────────────────────────────────────────────

export interface HabitFrequencyConfig {
  /** For `weekly_count`: how many days per week the habit should be done. */
  timesPerWeek?: number;
  /** For `specific_days`: weekday indices, 0 = Sunday … 6 = Saturday. */
  weekdays?: number[];
}

export interface Habit {
  id: string;
  name: string;
  domainId: string | null;
  frequencyType: HabitFrequencyType;
  frequencyConfig: HabitFrequencyConfig;
  /** Daily target. Binary habits use 1; quantitative habits use e.g. 3 (litres). */
  targetValue: number;
  /** Unit label, "" for binary habits, e.g. "L", "min", "session". */
  unit: string;
  /** lucide-react icon name. */
  icon: string;
  /** Hex color (falls back to the domain color when empty). */
  color: string;
  /** Reminder times for this habit, each "HH:MM". */
  reminderTimes: string[];
  archived: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  /** "YYYY-MM-DD". Unique per habit. */
  date: string;
  /** Logged amount. For binary habits this is 0 or 1. */
  value: number;
  completed: boolean;
  note: string | null;
  createdAt: string;
}

/** Habit streak / completion stats for a given window. */
export interface HabitStats {
  habitId: string;
  currentStreak: number;
  longestStreak: number;
  /** Completion rate 0-1 over the trailing window. */
  rate7d: number;
  rate30d: number;
  rateAllTime: number;
  /** Heatmap data: completed/expected value per date. */
  history: { date: string; value: number; completed: boolean }[];
}

/** A habit joined with today's log + stats — the shape the dashboard consumes. */
export interface HabitWithStatus extends Habit {
  todayLog: HabitLog | null;
  /** True when today's logged value meets the target. */
  doneToday: boolean;
  /** Whether the habit is scheduled for the given day at all. */
  dueToday: boolean;
  stats: HabitStats;
}

// ─── Time blocks & templates ───────────────────────────────────────────

export interface TimeBlock {
  id: string;
  /** "YYYY-MM-DD". */
  date: string;
  /** "HH:MM". */
  startTime: string;
  /** "HH:MM". */
  endTime: string;
  title: string;
  habitId: string | null;
  goalId: string | null;
  color: string;
  createdAt: string;
}

/** A block inside a template — same as TimeBlock but without a fixed date. */
export interface TemplateBlock {
  startTime: string;
  endTime: string;
  title: string;
  color: string;
  habitId: string | null;
  goalId: string | null;
}

export interface BlockTemplate {
  id: string;
  name: string;
  blocks: TemplateBlock[];
  createdAt: string;
}

// ─── Reminders ─────────────────────────────────────────────────────────

export interface Reminder {
  id: string;
  habitId: string | null;
  title: string;
  body: string;
  /** ISO timestamp the reminder is due. */
  scheduledTime: string;
  /** ISO timestamp a push was dispatched, or null if not yet sent. */
  sentAt: string | null;
  /** ISO timestamp the user acknowledged/completed it, or null. */
  acknowledgedAt: string | null;
  /** ISO timestamp to re-surface a snoozed reminder, or null. */
  snoozedUntil: string | null;
  type: ReminderType;
  createdAt: string;
}

// ─── Push subscriptions ────────────────────────────────────────────────

export interface PushSubscriptionRecord {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
  createdAt: string;
}

// ─── Health metrics ────────────────────────────────────────────────────

/**
 * A single daily health reading synced in from Apple Health (via an iOS
 * Shortcut posting to /api/health/ingest). One row per (date, metric):
 *   - sleep      → hours slept, attributed to the wake-up date
 *   - weight     → body weight that day
 *   - steps      → total step count for the day
 *   - resting_hr → resting heart rate that day
 */
export interface HealthMetric {
  id: string;
  /** "YYYY-MM-DD". Unique per metric. */
  date: string;
  metric: HealthMetricKind;
  value: number;
  /** Display unit, e.g. "h", "kg", "lb", "steps", "bpm". */
  unit: string;
  createdAt: string;
}

// ─── Settings ──────────────────────────────────────────────────────────

/** Strongly-typed view over the key/value `settings` table. */
export interface AppSettings {
  theme: Theme;
  /** First hour shown in the schedule grid, 0-23. */
  dayStartHour: number;
  /** Last hour shown in the schedule grid, 1-24. */
  dayEndHour: number;
  /** Name of the habit treated as the dashboard "water ring", or null. */
  waterHabitId: string | null;
  /** Whether the user has dismissed the iOS install hint. */
  iosInstallDismissed: boolean;
  /** Whether web-push has been enabled by the user. */
  pushEnabled: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  dayStartHour: 5,
  dayEndHour: 23,
  waterHabitId: null,
  iosInstallDismissed: false,
  pushEnabled: false,
};

// ─── Input types (create / update payloads) ───────────────────────────

/** Fields the server owns and the client never sends. */
type ServerOwned = "id" | "createdAt";

export type DomainInput = Omit<Domain, ServerOwned | "sortOrder"> & { sortOrder?: number };
export type GoalInput = Omit<Goal, ServerOwned | "sortOrder" | "progress" | "status"> &
  Partial<Pick<Goal, "sortOrder" | "progress" | "status">>;
export type HabitInput = Omit<Habit, ServerOwned | "sortOrder" | "archived"> &
  Partial<Pick<Habit, "sortOrder" | "archived">>;
export type HabitLogInput = Omit<HabitLog, ServerOwned>;
export type TimeBlockInput = Omit<TimeBlock, ServerOwned>;
export type BlockTemplateInput = Omit<BlockTemplate, ServerOwned>;
export type ReminderInput = Omit<Reminder, ServerOwned | "sentAt" | "acknowledgedAt" | "snoozedUntil"> &
  Partial<Pick<Reminder, "sentAt" | "acknowledgedAt" | "snoozedUntil">>;
export type PushSubscriptionInput = Omit<PushSubscriptionRecord, ServerOwned>;
export type HealthMetricInput = Omit<HealthMetric, ServerOwned>;

/** Every field optional — used for PATCH-style updates. */
export type Patch<T> = Partial<Omit<T, ServerOwned>>;
