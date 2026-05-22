/**
 * Drizzle ORM schema — SQLite dialect.
 *
 * This file is SQLite-specific. It is consumed only by the SQLite repository
 * implementation and by drizzle-kit (migrations). Nothing in app/ imports it
 * directly — routes and components depend on lib/types.ts instead.
 *
 * JSON-shaped columns are stored as TEXT and parsed in the repository layer.
 */

import { sql } from "drizzle-orm";
import {
  type AnySQLiteColumn,
  integer,
  real,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";

/** Default value for `created_at` columns: an ISO-8601 UTC timestamp. */
const nowIso = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

export const domains = sqliteTable("domains", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  icon: text("icon").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(nowIso),
});

export const goals = sqliteTable("goals", {
  id: text("id").primaryKey(),
  level: text("level", { enum: ["life", "yearly", "monthly", "daily"] }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  parentId: text("parent_id").references((): AnySQLiteColumn => goals.id, {
    onDelete: "cascade",
  }),
  domainId: text("domain_id").references(() => domains.id, { onDelete: "set null" }),
  targetDate: text("target_date"),
  status: text("status", { enum: ["active", "done", "archived"] })
    .notNull()
    .default("active"),
  /** Manual progress override 0-100; null means "roll up from children". */
  progress: real("progress"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(nowIso),
});

export const habits = sqliteTable("habits", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  domainId: text("domain_id").references(() => domains.id, { onDelete: "set null" }),
  frequencyType: text("frequency_type", {
    enum: ["daily", "weekly_count", "specific_days"],
  }).notNull(),
  /** JSON: { timesPerWeek?: number; weekdays?: number[] }. */
  frequencyConfig: text("frequency_config").notNull().default("{}"),
  targetValue: real("target_value").notNull().default(1),
  unit: text("unit").notNull().default(""),
  icon: text("icon").notNull().default("CircleCheck"),
  color: text("color").notNull().default(""),
  /** JSON: string[] of "HH:MM" reminder times. */
  reminderTimes: text("reminder_times").notNull().default("[]"),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(nowIso),
});

export const habitLogs = sqliteTable(
  "habit_logs",
  {
    id: text("id").primaryKey(),
    habitId: text("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    value: real("value").notNull().default(0),
    completed: integer("completed", { mode: "boolean" }).notNull().default(false),
    note: text("note"),
    createdAt: text("created_at").notNull().default(nowIso),
  },
  (t) => [unique("habit_logs_habit_date_unq").on(t.habitId, t.date)],
);

export const timeBlocks = sqliteTable("time_blocks", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  title: text("title").notNull(),
  habitId: text("habit_id").references(() => habits.id, { onDelete: "set null" }),
  goalId: text("goal_id").references(() => goals.id, { onDelete: "set null" }),
  color: text("color").notNull().default(""),
  createdAt: text("created_at").notNull().default(nowIso),
});

export const blockTemplates = sqliteTable("block_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  /** JSON: TemplateBlock[]. */
  blocks: text("blocks").notNull().default("[]"),
  createdAt: text("created_at").notNull().default(nowIso),
});

export const reminders = sqliteTable("reminders", {
  id: text("id").primaryKey(),
  habitId: text("habit_id").references(() => habits.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  scheduledTime: text("scheduled_time").notNull(),
  sentAt: text("sent_at"),
  acknowledgedAt: text("acknowledged_at"),
  snoozedUntil: text("snoozed_until"),
  type: text("type", { enum: ["habit", "custom"] }).notNull().default("habit"),
  createdAt: text("created_at").notNull().default(nowIso),
});

export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: text("id").primaryKey(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  createdAt: text("created_at").notNull().default(nowIso),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
