/**
 * Row ↔ domain mappers for the SQLite repository.
 *
 * The Drizzle schema stores JSON-shaped data as TEXT columns. These pure
 * functions are the only place that (de)serializes those columns, so the
 * repository can speak entirely in terms of the domain types from lib/types.ts.
 */

import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

import type {
  blockTemplates,
  domains,
  goals,
  habitLogs,
  habits,
  pushSubscriptions,
  reminders,
  timeBlocks,
} from "../schema";
import type {
  BlockTemplate,
  Domain,
  Goal,
  Habit,
  HabitFrequencyConfig,
  HabitLog,
  PushSubscriptionRecord,
  Reminder,
  TemplateBlock,
  TimeBlock,
} from "../../types";

// ─── Row types (inferred from the Drizzle schema) ──────────────────────

export type DomainRow = InferSelectModel<typeof domains>;
export type GoalRow = InferSelectModel<typeof goals>;
export type HabitRow = InferSelectModel<typeof habits>;
export type HabitLogRow = InferSelectModel<typeof habitLogs>;
export type TimeBlockRow = InferSelectModel<typeof timeBlocks>;
export type BlockTemplateRow = InferSelectModel<typeof blockTemplates>;
export type ReminderRow = InferSelectModel<typeof reminders>;
export type PushSubscriptionRow = InferSelectModel<typeof pushSubscriptions>;

export type DomainInsert = InferInsertModel<typeof domains>;
export type GoalInsert = InferInsertModel<typeof goals>;
export type HabitInsert = InferInsertModel<typeof habits>;
export type HabitLogInsert = InferInsertModel<typeof habitLogs>;
export type TimeBlockInsert = InferInsertModel<typeof timeBlocks>;
export type BlockTemplateInsert = InferInsertModel<typeof blockTemplates>;
export type ReminderInsert = InferInsertModel<typeof reminders>;
export type PushSubscriptionInsert = InferInsertModel<typeof pushSubscriptions>;

// ─── JSON helpers ──────────────────────────────────────────────────────

function parseFrequencyConfig(raw: string): HabitFrequencyConfig {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed as HabitFrequencyConfig;
    }
  } catch {
    /* fall through to default */
  }
  return {};
}

function parseStringArray(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((v): v is string => typeof v === "string");
    }
  } catch {
    /* fall through to default */
  }
  return [];
}

function parseTemplateBlocks(raw: string): TemplateBlock[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as TemplateBlock[];
    }
  } catch {
    /* fall through to default */
  }
  return [];
}

// ─── Domain ────────────────────────────────────────────────────────────

export function rowToDomain(row: DomainRow): Domain {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
  };
}

// ─── Goal ──────────────────────────────────────────────────────────────

export function rowToGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    level: row.level,
    title: row.title,
    description: row.description,
    parentId: row.parentId,
    domainId: row.domainId,
    targetDate: row.targetDate,
    status: row.status,
    progress: row.progress,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
  };
}

// ─── Habit ─────────────────────────────────────────────────────────────

export function rowToHabit(row: HabitRow): Habit {
  return {
    id: row.id,
    name: row.name,
    domainId: row.domainId,
    frequencyType: row.frequencyType,
    frequencyConfig: parseFrequencyConfig(row.frequencyConfig),
    targetValue: row.targetValue,
    unit: row.unit,
    icon: row.icon,
    color: row.color,
    reminderTimes: parseStringArray(row.reminderTimes),
    archived: row.archived,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
  };
}

/** Serialize a habit's JSON columns for an insert/update payload. */
export function habitJsonColumns(habit: {
  frequencyConfig: HabitFrequencyConfig;
  reminderTimes: string[];
}): { frequencyConfig: string; reminderTimes: string } {
  return {
    frequencyConfig: JSON.stringify(habit.frequencyConfig),
    reminderTimes: JSON.stringify(habit.reminderTimes),
  };
}

// ─── Habit log ─────────────────────────────────────────────────────────

export function rowToHabitLog(row: HabitLogRow): HabitLog {
  return {
    id: row.id,
    habitId: row.habitId,
    date: row.date,
    value: row.value,
    completed: row.completed,
    note: row.note,
    createdAt: row.createdAt,
  };
}

// ─── Time block ────────────────────────────────────────────────────────

export function rowToTimeBlock(row: TimeBlockRow): TimeBlock {
  return {
    id: row.id,
    date: row.date,
    startTime: row.startTime,
    endTime: row.endTime,
    title: row.title,
    habitId: row.habitId,
    goalId: row.goalId,
    color: row.color,
    createdAt: row.createdAt,
  };
}

// ─── Block template ────────────────────────────────────────────────────

export function rowToBlockTemplate(row: BlockTemplateRow): BlockTemplate {
  return {
    id: row.id,
    name: row.name,
    blocks: parseTemplateBlocks(row.blocks),
    createdAt: row.createdAt,
  };
}

/** Serialize a template's `blocks` column for an insert/update payload. */
export function templateBlocksColumn(blocks: TemplateBlock[]): string {
  return JSON.stringify(blocks);
}

// ─── Reminder ──────────────────────────────────────────────────────────

export function rowToReminder(row: ReminderRow): Reminder {
  return {
    id: row.id,
    habitId: row.habitId,
    title: row.title,
    body: row.body,
    scheduledTime: row.scheduledTime,
    sentAt: row.sentAt,
    acknowledgedAt: row.acknowledgedAt,
    snoozedUntil: row.snoozedUntil,
    type: row.type,
    createdAt: row.createdAt,
  };
}

// ─── Push subscription ─────────────────────────────────────────────────

export function rowToPushSubscription(row: PushSubscriptionRow): PushSubscriptionRecord {
  return {
    id: row.id,
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
    userAgent: row.userAgent,
    createdAt: row.createdAt,
  };
}
