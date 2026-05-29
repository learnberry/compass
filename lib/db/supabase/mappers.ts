/**
 * Row → domain mappers for the Supabase repository.
 *
 * PostgREST returns rows in snake_case. Unlike the SQLite backend, JSON-shaped
 * columns (`frequency_config`, `reminder_times`, `blocks`) are real `jsonb`
 * columns, so they arrive already parsed — no JSON.parse is needed here.
 *
 * One conversion does matter: `time_blocks.start_time` / `end_time` are Postgres
 * `time` columns and come back as "HH:MM:SS", but the domain type uses "HH:MM".
 */

import type {
  BlockTemplate,
  Domain,
  Goal,
  Habit,
  HabitFrequencyConfig,
  HabitLog,
  HealthMetric,
  PushSubscriptionRecord,
  Reminder,
  TemplateBlock,
  TimeBlock,
} from "../../types";

// ─── Row shapes (as returned by PostgREST) ─────────────────────────────

export interface DomainRow {
  id: string;
  name: string;
  color: string;
  icon: string;
  sort_order: number;
  created_at: string;
}

export interface GoalRow {
  id: string;
  level: Goal["level"];
  title: string;
  description: string | null;
  parent_id: string | null;
  domain_id: string | null;
  target_date: string | null;
  status: Goal["status"];
  progress: number | null;
  sort_order: number;
  created_at: string;
}

export interface HabitRow {
  id: string;
  name: string;
  domain_id: string | null;
  frequency_type: Habit["frequencyType"];
  frequency_config: HabitFrequencyConfig;
  target_value: number;
  unit: string;
  icon: string;
  color: string;
  reminder_times: string[];
  archived: boolean;
  sort_order: number;
  created_at: string;
}

export interface HabitLogRow {
  id: string;
  habit_id: string;
  date: string;
  value: number;
  completed: boolean;
  note: string | null;
  created_at: string;
}

export interface TimeBlockRow {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  title: string;
  habit_id: string | null;
  goal_id: string | null;
  color: string;
  created_at: string;
}

export interface BlockTemplateRow {
  id: string;
  name: string;
  blocks: TemplateBlock[];
  created_at: string;
}

export interface ReminderRow {
  id: string;
  habit_id: string | null;
  title: string;
  body: string;
  scheduled_time: string;
  sent_at: string | null;
  acknowledged_at: string | null;
  snoozed_until: string | null;
  type: Reminder["type"];
  created_at: string;
}

export interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
}

export interface HealthMetricRow {
  id: string;
  date: string;
  metric: HealthMetric["metric"];
  value: number;
  unit: string;
  created_at: string;
}

export interface SettingRow {
  key: string;
  value: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────

/** Postgres `time` columns serialize as "HH:MM:SS"; the domain uses "HH:MM". */
function toClockTime(value: string): string {
  return value.slice(0, 5);
}

// ─── Mappers ───────────────────────────────────────────────────────────

export function rowToDomain(row: DomainRow): Domain {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export function rowToGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    level: row.level,
    title: row.title,
    description: row.description,
    parentId: row.parent_id,
    domainId: row.domain_id,
    targetDate: row.target_date,
    status: row.status,
    progress: row.progress,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export function rowToHabit(row: HabitRow): Habit {
  return {
    id: row.id,
    name: row.name,
    domainId: row.domain_id,
    frequencyType: row.frequency_type,
    frequencyConfig: row.frequency_config ?? {},
    targetValue: row.target_value,
    unit: row.unit,
    icon: row.icon,
    color: row.color,
    reminderTimes: row.reminder_times ?? [],
    archived: row.archived,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export function rowToHabitLog(row: HabitLogRow): HabitLog {
  return {
    id: row.id,
    habitId: row.habit_id,
    date: row.date,
    value: row.value,
    completed: row.completed,
    note: row.note,
    createdAt: row.created_at,
  };
}

export function rowToTimeBlock(row: TimeBlockRow): TimeBlock {
  return {
    id: row.id,
    date: row.date,
    startTime: toClockTime(row.start_time),
    endTime: toClockTime(row.end_time),
    title: row.title,
    habitId: row.habit_id,
    goalId: row.goal_id,
    color: row.color,
    createdAt: row.created_at,
  };
}

export function rowToBlockTemplate(row: BlockTemplateRow): BlockTemplate {
  return {
    id: row.id,
    name: row.name,
    blocks: row.blocks ?? [],
    createdAt: row.created_at,
  };
}

export function rowToReminder(row: ReminderRow): Reminder {
  return {
    id: row.id,
    habitId: row.habit_id,
    title: row.title,
    body: row.body,
    scheduledTime: row.scheduled_time,
    sentAt: row.sent_at,
    acknowledgedAt: row.acknowledged_at,
    snoozedUntil: row.snoozed_until,
    type: row.type,
    createdAt: row.created_at,
  };
}

export function rowToHealthMetric(row: HealthMetricRow): HealthMetric {
  return {
    id: row.id,
    date: row.date,
    metric: row.metric,
    value: Number(row.value),
    unit: row.unit,
    createdAt: row.created_at,
  };
}

export function rowToPushSubscription(row: PushSubscriptionRow): PushSubscriptionRecord {
  return {
    id: row.id,
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  };
}
