/**
 * SQLite implementation of the Compass `Repository` contract.
 *
 * better-sqlite3 is synchronous; every method is still declared `async` so the
 * interface can also be satisfied by a genuinely async backend (see
 * lib/db/repository.ts). The bodies simply `return` synchronous results.
 */

import { and, asc, eq, gte, isNull, lte, or } from "drizzle-orm";

import { isoNow, lastNDays, shiftDate, weekStart, weekdayOf } from "../../dates";
import type {
  AppSettings,
  BlockTemplate,
  BlockTemplateInput,
  Domain,
  DomainInput,
  Goal,
  GoalInput,
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
} from "../../types";
import { DEFAULT_SETTINGS } from "../../types";
import { newId } from "../../utils";
import type {
  GoalFilter,
  HabitLogFilter,
  ReminderFilter,
  Repository,
} from "../repository";
import {
  blockTemplates,
  domains,
  goals,
  habitLogs,
  habits,
  pushSubscriptions,
  reminders,
  settings,
  timeBlocks,
} from "../schema";
import { db } from "./client";
import {
  habitJsonColumns,
  rowToBlockTemplate,
  rowToDomain,
  rowToGoal,
  rowToHabit,
  rowToHabitLog,
  rowToPushSubscription,
  rowToReminder,
  rowToTimeBlock,
  templateBlocksColumn,
} from "./mappers";

/** Trailing window (days) the habit-stats history covers. */
const HISTORY_DAYS = 365;

export class SqliteRepository implements Repository {
  // ─── Domains ──────────────────────────────────────────────────────────

  async listDomains(): Promise<Domain[]> {
    const rows = db
      .select()
      .from(domains)
      .orderBy(asc(domains.sortOrder), asc(domains.createdAt))
      .all();
    return rows.map(rowToDomain);
  }

  async getDomain(id: string): Promise<Domain | null> {
    const row = db.select().from(domains).where(eq(domains.id, id)).get();
    return row ? rowToDomain(row) : null;
  }

  async createDomain(input: DomainInput): Promise<Domain> {
    const row = {
      id: newId(),
      name: input.name,
      color: input.color,
      icon: input.icon,
      sortOrder: input.sortOrder ?? 0,
      createdAt: isoNow(),
    };
    db.insert(domains).values(row).run();
    return rowToDomain(row);
  }

  async updateDomain(id: string, patch: Patch<Domain>): Promise<Domain | null> {
    const existing = db.select().from(domains).where(eq(domains.id, id)).get();
    if (!existing) return null;
    const next = {
      name: patch.name ?? existing.name,
      color: patch.color ?? existing.color,
      icon: patch.icon ?? existing.icon,
      sortOrder: patch.sortOrder ?? existing.sortOrder,
    };
    db.update(domains).set(next).where(eq(domains.id, id)).run();
    return rowToDomain({ ...existing, ...next });
  }

  async deleteDomain(id: string): Promise<void> {
    db.delete(domains).where(eq(domains.id, id)).run();
  }

  // ─── Goals ────────────────────────────────────────────────────────────

  async listGoals(filter?: GoalFilter): Promise<Goal[]> {
    const conds = [];
    if (filter?.level) conds.push(eq(goals.level, filter.level));
    if (filter?.status) conds.push(eq(goals.status, filter.status));
    if (filter?.domainId) conds.push(eq(goals.domainId, filter.domainId));
    if (filter && "parentId" in filter) {
      conds.push(
        filter.parentId === null
          ? isNull(goals.parentId)
          : eq(goals.parentId, filter.parentId as string),
      );
    }
    const rows = db
      .select()
      .from(goals)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(asc(goals.sortOrder), asc(goals.createdAt))
      .all();
    return rows.map(rowToGoal);
  }

  async getGoal(id: string): Promise<Goal | null> {
    const row = db.select().from(goals).where(eq(goals.id, id)).get();
    return row ? rowToGoal(row) : null;
  }

  async getGoalTree(): Promise<GoalWithProgress[]> {
    const rows = db
      .select()
      .from(goals)
      .orderBy(asc(goals.sortOrder), asc(goals.createdAt))
      .all();
    const all = rows.map(rowToGoal);

    const childrenOf = new Map<string | null, Goal[]>();
    for (const g of all) {
      const key = g.parentId;
      const bucket = childrenOf.get(key);
      if (bucket) bucket.push(g);
      else childrenOf.set(key, [g]);
    }

    const build = (goal: Goal): GoalWithProgress => {
      const kids = (childrenOf.get(goal.id) ?? []).map(build);
      let computedProgress: number;
      if (goal.progress != null) {
        computedProgress = goal.progress;
      } else if (kids.length > 0) {
        const sum = kids.reduce((acc, k) => acc + k.computedProgress, 0);
        computedProgress = sum / kids.length;
      } else {
        computedProgress = goal.status === "done" ? 100 : 0;
      }
      return { ...goal, computedProgress, children: kids };
    };

    return (childrenOf.get(null) ?? []).map(build);
  }

  async createGoal(input: GoalInput): Promise<Goal> {
    const row = {
      id: newId(),
      level: input.level,
      title: input.title,
      description: input.description,
      parentId: input.parentId,
      domainId: input.domainId,
      targetDate: input.targetDate,
      status: input.status ?? "active",
      progress: input.progress ?? null,
      sortOrder: input.sortOrder ?? 0,
      createdAt: isoNow(),
    };
    db.insert(goals).values(row).run();
    return rowToGoal(row);
  }

  async updateGoal(id: string, patch: Patch<Goal>): Promise<Goal | null> {
    const existing = db.select().from(goals).where(eq(goals.id, id)).get();
    if (!existing) return null;
    const next = {
      level: patch.level ?? existing.level,
      title: patch.title ?? existing.title,
      description: patch.description !== undefined ? patch.description : existing.description,
      parentId: patch.parentId !== undefined ? patch.parentId : existing.parentId,
      domainId: patch.domainId !== undefined ? patch.domainId : existing.domainId,
      targetDate: patch.targetDate !== undefined ? patch.targetDate : existing.targetDate,
      status: patch.status ?? existing.status,
      progress: patch.progress !== undefined ? patch.progress : existing.progress,
      sortOrder: patch.sortOrder ?? existing.sortOrder,
    };
    db.update(goals).set(next).where(eq(goals.id, id)).run();
    return rowToGoal({ ...existing, ...next });
  }

  async deleteGoal(id: string): Promise<void> {
    db.delete(goals).where(eq(goals.id, id)).run();
  }

  // ─── Habits ───────────────────────────────────────────────────────────

  async listHabits(opts?: { includeArchived?: boolean }): Promise<Habit[]> {
    const rows = db
      .select()
      .from(habits)
      .where(opts?.includeArchived ? undefined : eq(habits.archived, false))
      .orderBy(asc(habits.sortOrder), asc(habits.createdAt))
      .all();
    return rows.map(rowToHabit);
  }

  async getHabit(id: string): Promise<Habit | null> {
    const row = db.select().from(habits).where(eq(habits.id, id)).get();
    return row ? rowToHabit(row) : null;
  }

  async createHabit(input: HabitInput): Promise<Habit> {
    const json = habitJsonColumns({
      frequencyConfig: input.frequencyConfig,
      reminderTimes: input.reminderTimes,
    });
    const row = {
      id: newId(),
      name: input.name,
      domainId: input.domainId,
      frequencyType: input.frequencyType,
      frequencyConfig: json.frequencyConfig,
      targetValue: input.targetValue,
      unit: input.unit,
      icon: input.icon,
      color: input.color,
      reminderTimes: json.reminderTimes,
      archived: input.archived ?? false,
      sortOrder: input.sortOrder ?? 0,
      createdAt: isoNow(),
    };
    db.insert(habits).values(row).run();
    return rowToHabit(row);
  }

  async updateHabit(id: string, patch: Patch<Habit>): Promise<Habit | null> {
    const existing = db.select().from(habits).where(eq(habits.id, id)).get();
    if (!existing) return null;
    const next = {
      name: patch.name ?? existing.name,
      domainId: patch.domainId !== undefined ? patch.domainId : existing.domainId,
      frequencyType: patch.frequencyType ?? existing.frequencyType,
      frequencyConfig:
        patch.frequencyConfig !== undefined
          ? JSON.stringify(patch.frequencyConfig)
          : existing.frequencyConfig,
      targetValue: patch.targetValue ?? existing.targetValue,
      unit: patch.unit ?? existing.unit,
      icon: patch.icon ?? existing.icon,
      color: patch.color !== undefined ? patch.color : existing.color,
      reminderTimes:
        patch.reminderTimes !== undefined
          ? JSON.stringify(patch.reminderTimes)
          : existing.reminderTimes,
      archived: patch.archived ?? existing.archived,
      sortOrder: patch.sortOrder ?? existing.sortOrder,
    };
    db.update(habits).set(next).where(eq(habits.id, id)).run();
    return rowToHabit({ ...existing, ...next });
  }

  async deleteHabit(id: string): Promise<void> {
    db.delete(habits).where(eq(habits.id, id)).run();
  }

  // ─── Habit logs ───────────────────────────────────────────────────────

  async listHabitLogs(filter?: HabitLogFilter): Promise<HabitLog[]> {
    const conds = [];
    if (filter?.habitId) conds.push(eq(habitLogs.habitId, filter.habitId));
    if (filter?.from) conds.push(gte(habitLogs.date, filter.from));
    if (filter?.to) conds.push(lte(habitLogs.date, filter.to));
    const rows = db
      .select()
      .from(habitLogs)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(asc(habitLogs.date))
      .all();
    return rows.map(rowToHabitLog);
  }

  async getHabitLog(habitId: string, date: string): Promise<HabitLog | null> {
    const row = db
      .select()
      .from(habitLogs)
      .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, date)))
      .get();
    return row ? rowToHabitLog(row) : null;
  }

  async upsertHabitLog(input: HabitLogInput): Promise<HabitLog> {
    const id = newId();
    const createdAt = isoNow();
    db.insert(habitLogs)
      .values({
        id,
        habitId: input.habitId,
        date: input.date,
        value: input.value,
        completed: input.completed,
        note: input.note,
        createdAt,
      })
      .onConflictDoUpdate({
        target: [habitLogs.habitId, habitLogs.date],
        set: {
          value: input.value,
          completed: input.completed,
          note: input.note,
        },
      })
      .run();
    const row = db
      .select()
      .from(habitLogs)
      .where(and(eq(habitLogs.habitId, input.habitId), eq(habitLogs.date, input.date)))
      .get();
    // Guaranteed present after the upsert above.
    return rowToHabitLog(row!);
  }

  async deleteHabitLog(id: string): Promise<void> {
    db.delete(habitLogs).where(eq(habitLogs.id, id)).run();
  }

  // ─── Derived habit data ───────────────────────────────────────────────

  async getHabitStats(habitId: string, refDate: string): Promise<HabitStats> {
    const habitRow = db.select().from(habits).where(eq(habits.id, habitId)).get();
    if (!habitRow) {
      return {
        habitId,
        currentStreak: 0,
        longestStreak: 0,
        rate7d: 0,
        rate30d: 0,
        rateAllTime: 0,
        history: [],
      };
    }
    const habit = rowToHabit(habitRow);

    // Trailing 365 days up to and including refDate.
    const windowStart = shiftDate(refDate, -(HISTORY_DAYS - 1));
    const logRows = db
      .select()
      .from(habitLogs)
      .where(
        and(
          eq(habitLogs.habitId, habitId),
          gte(habitLogs.date, windowStart),
          lte(habitLogs.date, refDate),
        ),
      )
      .all();
    const logByDate = new Map(logRows.map((r) => [r.date, r]));

    const isDueDay = (date: string): boolean => {
      switch (habit.frequencyType) {
        case "daily":
          return true;
        case "weekly_count":
          return true;
        case "specific_days":
          return (habit.frequencyConfig.weekdays ?? []).includes(weekdayOf(date));
      }
    };

    const isCompleted = (date: string): boolean => {
      const log = logByDate.get(date);
      if (!log) return false;
      return log.completed === true || log.value >= habit.targetValue;
    };

    // history — every day in the trailing window, oldest first.
    const allDates = lastNDays(HISTORY_DAYS, refDate);
    const history = allDates.map((date) => {
      const log = logByDate.get(date);
      return {
        date,
        value: log?.value ?? 0,
        completed: isCompleted(date),
      };
    });

    // currentStreak — walk backwards from refDate over DUE days only.
    let currentStreak = 0;
    let cursor = refDate;
    // Bound the walk to the history window.
    for (let i = 0; i < HISTORY_DAYS; i++) {
      if (cursor < windowStart) break;
      if (isDueDay(cursor)) {
        if (isCompleted(cursor)) {
          currentStreak++;
        } else if (cursor !== refDate) {
          // An incomplete due-day before refDate breaks the streak.
          break;
        }
        // refDate itself incomplete: don't break, don't count.
      }
      cursor = shiftDate(cursor, -1);
    }

    // longestStreak — longest run of completed due-days within history.
    let longestStreak = 0;
    let run = 0;
    for (const { date } of history) {
      if (!isDueDay(date)) continue;
      if (isCompleted(date)) {
        run++;
        if (run > longestStreak) longestStreak = run;
      } else {
        run = 0;
      }
    }

    // Completion rates over windows.
    const rateOver = (windowDays: number): number => {
      const from = shiftDate(refDate, -(windowDays - 1));
      let due = 0;
      let done = 0;
      for (const { date } of history) {
        if (date < from) continue;
        if (!isDueDay(date)) continue;
        due++;
        if (isCompleted(date)) done++;
      }
      return due > 0 ? done / due : 0;
    };

    const habitStartDate = habit.createdAt.slice(0, 10);
    const allTimeStart = habitStartDate > windowStart ? habitStartDate : windowStart;
    let allTimeDue = 0;
    let allTimeDone = 0;
    for (const { date } of history) {
      if (date < allTimeStart) continue;
      if (!isDueDay(date)) continue;
      allTimeDue++;
      if (isCompleted(date)) allTimeDone++;
    }

    return {
      habitId,
      currentStreak,
      longestStreak,
      rate7d: rateOver(7),
      rate30d: rateOver(30),
      rateAllTime: allTimeDue > 0 ? allTimeDone / allTimeDue : 0,
      history,
    };
  }

  async getHabitsWithStatus(date: string): Promise<HabitWithStatus[]> {
    const habitList = await this.listHabits();
    const out: HabitWithStatus[] = [];

    for (const habit of habitList) {
      const todayLog = await this.getHabitLog(habit.id, date);
      const doneToday =
        todayLog != null && (todayLog.completed || todayLog.value >= habit.targetValue);

      let dueToday: boolean;
      switch (habit.frequencyType) {
        case "daily":
          dueToday = true;
          break;
        case "specific_days":
          dueToday = (habit.frequencyConfig.weekdays ?? []).includes(weekdayOf(date));
          break;
        case "weekly_count": {
          const target = habit.frequencyConfig.timesPerWeek ?? 0;
          const start = weekStart(date);
          const end = shiftDate(start, 6);
          const weekLogs = db
            .select()
            .from(habitLogs)
            .where(
              and(
                eq(habitLogs.habitId, habit.id),
                gte(habitLogs.date, start),
                lte(habitLogs.date, end),
              ),
            )
            .all();
          const completedThisWeek = weekLogs.filter(
            (l) => l.completed === true || l.value >= habit.targetValue,
          ).length;
          dueToday = completedThisWeek < target;
          break;
        }
      }

      const stats = await this.getHabitStats(habit.id, date);
      out.push({ ...habit, todayLog, doneToday, dueToday, stats });
    }

    return out;
  }

  // ─── Time blocks ──────────────────────────────────────────────────────

  async listTimeBlocks(date: string): Promise<TimeBlock[]> {
    const rows = db
      .select()
      .from(timeBlocks)
      .where(eq(timeBlocks.date, date))
      .orderBy(asc(timeBlocks.startTime), asc(timeBlocks.createdAt))
      .all();
    return rows.map(rowToTimeBlock);
  }

  async getTimeBlock(id: string): Promise<TimeBlock | null> {
    const row = db.select().from(timeBlocks).where(eq(timeBlocks.id, id)).get();
    return row ? rowToTimeBlock(row) : null;
  }

  async createTimeBlock(input: TimeBlockInput): Promise<TimeBlock> {
    const row = {
      id: newId(),
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      title: input.title,
      habitId: input.habitId,
      goalId: input.goalId,
      color: input.color,
      createdAt: isoNow(),
    };
    db.insert(timeBlocks).values(row).run();
    return rowToTimeBlock(row);
  }

  async updateTimeBlock(id: string, patch: Patch<TimeBlock>): Promise<TimeBlock | null> {
    const existing = db.select().from(timeBlocks).where(eq(timeBlocks.id, id)).get();
    if (!existing) return null;
    const next = {
      date: patch.date ?? existing.date,
      startTime: patch.startTime ?? existing.startTime,
      endTime: patch.endTime ?? existing.endTime,
      title: patch.title ?? existing.title,
      habitId: patch.habitId !== undefined ? patch.habitId : existing.habitId,
      goalId: patch.goalId !== undefined ? patch.goalId : existing.goalId,
      color: patch.color ?? existing.color,
    };
    db.update(timeBlocks).set(next).where(eq(timeBlocks.id, id)).run();
    return rowToTimeBlock({ ...existing, ...next });
  }

  async deleteTimeBlock(id: string): Promise<void> {
    db.delete(timeBlocks).where(eq(timeBlocks.id, id)).run();
  }

  async applyTemplate(templateId: string, date: string): Promise<TimeBlock[]> {
    const tplRow = db
      .select()
      .from(blockTemplates)
      .where(eq(blockTemplates.id, templateId))
      .get();
    if (!tplRow) return [];
    const template = rowToBlockTemplate(tplRow);

    const created: TimeBlock[] = [];
    for (const block of template.blocks) {
      const row = {
        id: newId(),
        date,
        startTime: block.startTime,
        endTime: block.endTime,
        title: block.title,
        habitId: block.habitId,
        goalId: block.goalId,
        color: block.color,
        createdAt: isoNow(),
      };
      db.insert(timeBlocks).values(row).run();
      created.push(rowToTimeBlock(row));
    }
    return created;
  }

  // ─── Block templates ──────────────────────────────────────────────────

  async listTemplates(): Promise<BlockTemplate[]> {
    const rows = db
      .select()
      .from(blockTemplates)
      .orderBy(asc(blockTemplates.createdAt))
      .all();
    return rows.map(rowToBlockTemplate);
  }

  async getTemplate(id: string): Promise<BlockTemplate | null> {
    const row = db.select().from(blockTemplates).where(eq(blockTemplates.id, id)).get();
    return row ? rowToBlockTemplate(row) : null;
  }

  async createTemplate(input: BlockTemplateInput): Promise<BlockTemplate> {
    const row = {
      id: newId(),
      name: input.name,
      blocks: templateBlocksColumn(input.blocks),
      createdAt: isoNow(),
    };
    db.insert(blockTemplates).values(row).run();
    return rowToBlockTemplate(row);
  }

  async updateTemplate(
    id: string,
    patch: Patch<BlockTemplate>,
  ): Promise<BlockTemplate | null> {
    const existing = db
      .select()
      .from(blockTemplates)
      .where(eq(blockTemplates.id, id))
      .get();
    if (!existing) return null;
    const next = {
      name: patch.name ?? existing.name,
      blocks:
        patch.blocks !== undefined ? templateBlocksColumn(patch.blocks) : existing.blocks,
    };
    db.update(blockTemplates).set(next).where(eq(blockTemplates.id, id)).run();
    return rowToBlockTemplate({ ...existing, ...next });
  }

  async deleteTemplate(id: string): Promise<void> {
    db.delete(blockTemplates).where(eq(blockTemplates.id, id)).run();
  }

  // ─── Reminders ────────────────────────────────────────────────────────

  async listReminders(filter?: ReminderFilter): Promise<Reminder[]> {
    const conds = [];
    if (filter?.from) conds.push(gte(reminders.scheduledTime, filter.from));
    if (filter?.to) conds.push(lte(reminders.scheduledTime, filter.to));
    if (filter?.habitId) conds.push(eq(reminders.habitId, filter.habitId));
    if (filter?.unacknowledged) conds.push(isNull(reminders.acknowledgedAt));
    const rows = db
      .select()
      .from(reminders)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(asc(reminders.scheduledTime))
      .all();
    return rows.map(rowToReminder);
  }

  async getReminder(id: string): Promise<Reminder | null> {
    const row = db.select().from(reminders).where(eq(reminders.id, id)).get();
    return row ? rowToReminder(row) : null;
  }

  async createReminder(input: ReminderInput): Promise<Reminder> {
    const row = {
      id: newId(),
      habitId: input.habitId,
      title: input.title,
      body: input.body,
      scheduledTime: input.scheduledTime,
      sentAt: input.sentAt ?? null,
      acknowledgedAt: input.acknowledgedAt ?? null,
      snoozedUntil: input.snoozedUntil ?? null,
      type: input.type,
      createdAt: isoNow(),
    };
    db.insert(reminders).values(row).run();
    return rowToReminder(row);
  }

  async updateReminder(id: string, patch: Patch<Reminder>): Promise<Reminder | null> {
    const existing = db.select().from(reminders).where(eq(reminders.id, id)).get();
    if (!existing) return null;
    const next = {
      habitId: patch.habitId !== undefined ? patch.habitId : existing.habitId,
      title: patch.title ?? existing.title,
      body: patch.body ?? existing.body,
      scheduledTime: patch.scheduledTime ?? existing.scheduledTime,
      sentAt: patch.sentAt !== undefined ? patch.sentAt : existing.sentAt,
      acknowledgedAt:
        patch.acknowledgedAt !== undefined ? patch.acknowledgedAt : existing.acknowledgedAt,
      snoozedUntil:
        patch.snoozedUntil !== undefined ? patch.snoozedUntil : existing.snoozedUntil,
      type: patch.type ?? existing.type,
    };
    db.update(reminders).set(next).where(eq(reminders.id, id)).run();
    return rowToReminder({ ...existing, ...next });
  }

  async deleteReminder(id: string): Promise<void> {
    db.delete(reminders).where(eq(reminders.id, id)).run();
  }

  async getDueReminders(nowIso: string): Promise<Reminder[]> {
    const rows = db
      .select()
      .from(reminders)
      .where(
        and(
          lte(reminders.scheduledTime, nowIso),
          isNull(reminders.acknowledgedAt),
          or(isNull(reminders.snoozedUntil), lte(reminders.snoozedUntil, nowIso)),
        ),
      )
      .orderBy(asc(reminders.scheduledTime))
      .all();
    return rows.map(rowToReminder);
  }

  // ─── Push subscriptions ───────────────────────────────────────────────

  async listPushSubscriptions(): Promise<PushSubscriptionRecord[]> {
    const rows = db
      .select()
      .from(pushSubscriptions)
      .orderBy(asc(pushSubscriptions.createdAt))
      .all();
    return rows.map(rowToPushSubscription);
  }

  async upsertPushSubscription(
    input: PushSubscriptionInput,
  ): Promise<PushSubscriptionRecord> {
    const id = newId();
    const createdAt = isoNow();
    db.insert(pushSubscriptions)
      .values({
        id,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent,
        createdAt,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          p256dh: input.p256dh,
          auth: input.auth,
          userAgent: input.userAgent,
        },
      })
      .run();
    const row = db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, input.endpoint))
      .get();
    return rowToPushSubscription(row!);
  }

  async deletePushSubscription(endpoint: string): Promise<void> {
    db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint)).run();
  }

  // ─── Settings ─────────────────────────────────────────────────────────

  async getSettings(): Promise<AppSettings> {
    const rows = db.select().from(settings).all();
    const merged: AppSettings = { ...DEFAULT_SETTINGS };
    const view = merged as unknown as Record<string, unknown>;
    for (const row of rows) {
      if (!(row.key in DEFAULT_SETTINGS)) continue;
      try {
        const value: unknown = JSON.parse(row.value);
        // The key is known to be an AppSettings key; assign through a record view.
        view[row.key] = value;
      } catch {
        /* skip malformed value */
      }
    }
    return merged;
  }

  async updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
    for (const [key, value] of Object.entries(patch)) {
      db.insert(settings)
        .values({ key, value: JSON.stringify(value) })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: JSON.stringify(value) },
        })
        .run();
    }
    return this.getSettings();
  }
}
