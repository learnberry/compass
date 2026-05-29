/**
 * Zod schemas for every API input shape.
 *
 * These mirror the `*Input` / `Patch<T>` types in lib/types.ts. Route handlers
 * parse request bodies through them so invalid payloads become 400s.
 */

import { z } from "zod";
import {
  GOAL_LEVELS,
  GOAL_STATUSES,
  HABIT_FREQUENCY_TYPES,
  HEALTH_METRICS,
  REMINDER_TYPES,
  THEMES,
} from "@/lib/types";

// ─── Primitives ────────────────────────────────────────────────────────

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
const clockTime = z.string().regex(/^\d{2}:\d{2}$/, "expected HH:MM");

// ─── Domains ───────────────────────────────────────────────────────────

export const domainInputSchema = z.object({
  name: z.string().min(1),
  color: z.string().min(1),
  icon: z.string().min(1),
  sortOrder: z.number().optional(),
});

export const domainPatchSchema = domainInputSchema.partial();

// ─── Goals ─────────────────────────────────────────────────────────────

export const goalInputSchema = z.object({
  level: z.enum(GOAL_LEVELS),
  title: z.string().min(1),
  description: z.string().nullable(),
  parentId: z.string().nullable(),
  domainId: z.string().nullable(),
  targetDate: z.string().nullable(),
  status: z.enum(GOAL_STATUSES).optional(),
  progress: z.number().min(0).max(100).nullable().optional(),
  sortOrder: z.number().optional(),
});

export const goalPatchSchema = goalInputSchema.partial();

// ─── Habits ────────────────────────────────────────────────────────────

const habitFrequencyConfigSchema = z.object({
  timesPerWeek: z.number().optional(),
  weekdays: z.array(z.number()).optional(),
});

export const habitInputSchema = z.object({
  name: z.string().min(1),
  domainId: z.string().nullable(),
  frequencyType: z.enum(HABIT_FREQUENCY_TYPES),
  frequencyConfig: habitFrequencyConfigSchema,
  targetValue: z.number(),
  unit: z.string(),
  icon: z.string(),
  color: z.string(),
  reminderTimes: z.array(z.string()),
  archived: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export const habitPatchSchema = habitInputSchema.partial();

// ─── Habit logs ────────────────────────────────────────────────────────

export const habitLogInputSchema = z.object({
  habitId: z.string().min(1),
  date: isoDate,
  value: z.number(),
  completed: z.boolean(),
  note: z.string().nullable(),
});

export const habitLogPatchSchema = habitLogInputSchema.partial();

// ─── Time blocks ───────────────────────────────────────────────────────

export const timeBlockInputSchema = z.object({
  date: isoDate,
  startTime: clockTime,
  endTime: clockTime,
  title: z.string().min(1),
  habitId: z.string().nullable(),
  goalId: z.string().nullable(),
  color: z.string(),
});

export const timeBlockPatchSchema = timeBlockInputSchema.partial();

// ─── Block templates ───────────────────────────────────────────────────

const templateBlockSchema = z.object({
  startTime: clockTime,
  endTime: clockTime,
  title: z.string().min(1),
  color: z.string(),
  habitId: z.string().nullable(),
  goalId: z.string().nullable(),
});

export const blockTemplateInputSchema = z.object({
  name: z.string().min(1),
  blocks: z.array(templateBlockSchema),
});

export const blockTemplatePatchSchema = blockTemplateInputSchema.partial();

// ─── Reminders ─────────────────────────────────────────────────────────

export const reminderInputSchema = z.object({
  habitId: z.string().nullable(),
  title: z.string().min(1),
  body: z.string(),
  scheduledTime: z.string().min(1),
  type: z.enum(REMINDER_TYPES),
  sentAt: z.string().nullable().optional(),
  acknowledgedAt: z.string().nullable().optional(),
  snoozedUntil: z.string().nullable().optional(),
});

export const reminderPatchSchema = reminderInputSchema.partial();

// ─── Settings ──────────────────────────────────────────────────────────

export const settingsPatchSchema = z
  .object({
    theme: z.enum(THEMES),
    dayStartHour: z.number().min(0).max(23),
    dayEndHour: z.number().min(1).max(24),
    waterHabitId: z.string().nullable(),
    iosInstallDismissed: z.boolean(),
    pushEnabled: z.boolean(),
  })
  .partial();

// ─── Health ingest ─────────────────────────────────────────────────────

/**
 * Payload accepted by POST /api/health/ingest. Two interchangeable shapes so
 * the iOS Shortcut can build whichever is easier:
 *
 *   Flat (easiest in Shortcuts — one Dictionary action):
 *     { "date": "2026-05-28", "sleep": 7.5, "weight": 78.3,
 *       "steps": 8432, "restingHr": 58, "weightUnit": "kg" }
 *
 *   Explicit array (full control over units / per-sample dates):
 *     { "metrics": [ { "metric": "sleep", "value": 7.5, "unit": "h",
 *                      "date": "2026-05-28" }, … ] }
 *
 * `date` defaults to the server's current day when omitted. Values use
 * `coerce` because Shortcuts often serializes numbers as strings.
 */
export const healthIngestSchema = z
  .object({
    date: isoDate.optional(),
    sleep: z.coerce.number().nonnegative().optional(),
    weight: z.coerce.number().positive().optional(),
    steps: z.coerce.number().nonnegative().optional(),
    restingHr: z.coerce.number().positive().optional(),
    weightUnit: z.enum(["kg", "lb"]).optional(),
    metrics: z
      .array(
        z.object({
          date: isoDate.optional(),
          metric: z.enum(HEALTH_METRICS),
          value: z.coerce.number(),
          unit: z.string().min(1).optional(),
        }),
      )
      .optional(),
  })
  .refine(
    (b) =>
      (b.metrics?.length ?? 0) > 0 ||
      b.sleep !== undefined ||
      b.weight !== undefined ||
      b.steps !== undefined ||
      b.restingHr !== undefined,
    { message: "no health metrics provided" },
  );

export type HealthIngestBody = z.infer<typeof healthIngestSchema>;

// ─── Action bodies ─────────────────────────────────────────────────────

export const applyTemplateBodySchema = z.object({
  templateId: z.string().min(1),
  date: isoDate,
});

export const snoozeBodySchema = z.object({
  minutes: z.number(),
});

// ─── Body parsing helper ───────────────────────────────────────────────

/**
 * Reads the JSON body of a request and validates it against `schema`.
 * A malformed body or a schema mismatch throws (the route's `handle`
 * wrapper turns ZodError into a 400).
 */
export async function parseJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    raw = undefined;
  }
  return schema.parse(raw);
}
