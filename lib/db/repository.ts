/**
 * The Compass data layer abstraction.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  SWAPPING THE DATABASE IS A ONE-FILE CHANGE — IT IS THIS FILE.        │
 * │                                                                       │
 * │  Every route handler and server component calls `getRepository()`     │
 * │  and depends only on the `Repository` interface below. To move off    │
 * │  SQLite (e.g. to Supabase):                                           │
 * │    1. Add lib/db/supabase/repository.ts implementing `Repository`.    │
 * │    2. Change the single `new SqliteRepository()` line in              │
 * │       `getRepository()` to `new SupabaseRepository()`.                │
 * │  Nothing else in the codebase changes.                                │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * All methods are async so an async backend (Supabase, HTTP, etc.) can
 * implement the exact same contract — even though the SQLite implementation
 * is synchronous under the hood.
 */

import type {
  AppSettings,
  BlockTemplate,
  BlockTemplateInput,
  Domain,
  DomainInput,
  Goal,
  GoalInput,
  GoalLevel,
  GoalStatus,
  GoalWithProgress,
  Habit,
  HabitInput,
  HabitLog,
  HabitLogInput,
  HabitStats,
  HabitWithStatus,
  Patch,
  PushSubscriptionInput,
  PushSubscriptionRecord,
  Reminder,
  ReminderInput,
  TimeBlock,
  TimeBlockInput,
} from "../types";

// ─── Query filters ─────────────────────────────────────────────────────

export interface GoalFilter {
  level?: GoalLevel;
  parentId?: string | null;
  status?: GoalStatus;
  domainId?: string;
}

export interface HabitLogFilter {
  habitId?: string;
  /** Inclusive "YYYY-MM-DD" lower bound. */
  from?: string;
  /** Inclusive "YYYY-MM-DD" upper bound. */
  to?: string;
}

export interface ReminderFilter {
  /** Inclusive ISO lower bound on scheduledTime. */
  from?: string;
  /** Inclusive ISO upper bound on scheduledTime. */
  to?: string;
  /** When true, only reminders not yet acknowledged. */
  unacknowledged?: boolean;
  habitId?: string;
}

// ─── The interface ─────────────────────────────────────────────────────

export interface Repository {
  // Domains
  listDomains(): Promise<Domain[]>;
  getDomain(id: string): Promise<Domain | null>;
  createDomain(input: DomainInput): Promise<Domain>;
  updateDomain(id: string, patch: Patch<Domain>): Promise<Domain | null>;
  deleteDomain(id: string): Promise<void>;

  // Goals
  listGoals(filter?: GoalFilter): Promise<Goal[]>;
  getGoal(id: string): Promise<Goal | null>;
  /** Full life→yearly→monthly→daily tree with rolled-up `computedProgress`. */
  getGoalTree(): Promise<GoalWithProgress[]>;
  createGoal(input: GoalInput): Promise<Goal>;
  updateGoal(id: string, patch: Patch<Goal>): Promise<Goal | null>;
  deleteGoal(id: string): Promise<void>;

  // Habits
  listHabits(opts?: { includeArchived?: boolean }): Promise<Habit[]>;
  getHabit(id: string): Promise<Habit | null>;
  createHabit(input: HabitInput): Promise<Habit>;
  updateHabit(id: string, patch: Patch<Habit>): Promise<Habit | null>;
  deleteHabit(id: string): Promise<void>;

  // Habit logs
  listHabitLogs(filter?: HabitLogFilter): Promise<HabitLog[]>;
  getHabitLog(habitId: string, date: string): Promise<HabitLog | null>;
  /** Insert or update the single log row for (habitId, date). */
  upsertHabitLog(input: HabitLogInput): Promise<HabitLog>;
  deleteHabitLog(id: string): Promise<void>;

  // Derived habit data
  getHabitStats(habitId: string, refDate: string): Promise<HabitStats>;
  /** Every active habit joined with its log + stats for `date`. */
  getHabitsWithStatus(date: string): Promise<HabitWithStatus[]>;

  // Time blocks
  listTimeBlocks(date: string): Promise<TimeBlock[]>;
  getTimeBlock(id: string): Promise<TimeBlock | null>;
  createTimeBlock(input: TimeBlockInput): Promise<TimeBlock>;
  updateTimeBlock(id: string, patch: Patch<TimeBlock>): Promise<TimeBlock | null>;
  deleteTimeBlock(id: string): Promise<void>;
  /** Instantiate every block of a template onto `date`. Returns new blocks. */
  applyTemplate(templateId: string, date: string): Promise<TimeBlock[]>;

  // Block templates
  listTemplates(): Promise<BlockTemplate[]>;
  getTemplate(id: string): Promise<BlockTemplate | null>;
  createTemplate(input: BlockTemplateInput): Promise<BlockTemplate>;
  updateTemplate(id: string, patch: Patch<BlockTemplate>): Promise<BlockTemplate | null>;
  deleteTemplate(id: string): Promise<void>;

  // Reminders
  listReminders(filter?: ReminderFilter): Promise<Reminder[]>;
  getReminder(id: string): Promise<Reminder | null>;
  createReminder(input: ReminderInput): Promise<Reminder>;
  updateReminder(id: string, patch: Patch<Reminder>): Promise<Reminder | null>;
  deleteReminder(id: string): Promise<void>;
  /** Reminders due at or before `nowIso`, not acknowledged and not snoozed. */
  getDueReminders(nowIso: string): Promise<Reminder[]>;

  // Push subscriptions
  listPushSubscriptions(): Promise<PushSubscriptionRecord[]>;
  /** Insert, or update in place when the endpoint already exists. */
  upsertPushSubscription(input: PushSubscriptionInput): Promise<PushSubscriptionRecord>;
  deletePushSubscription(endpoint: string): Promise<void>;

  // Settings (typed view over the key/value table)
  getSettings(): Promise<AppSettings>;
  updateSettings(patch: Partial<AppSettings>): Promise<AppSettings>;
}

// ─── Factory (the swap point) ──────────────────────────────────────────

import { SqliteRepository } from "./sqlite/repository";

let instance: Repository | null = null;

/**
 * Returns the process-wide repository singleton.
 *
 * To switch databases, change ONLY the implementation constructed below.
 */
export function getRepository(): Repository {
  if (!instance) {
    instance = new SqliteRepository();
  }
  return instance;
}
