/**
 * Supabase (Postgres) implementation of the Compass `Repository` contract.
 *
 * Uses @supabase/supabase-js against the service-role client in ./client. The
 * pure-computation methods (`getGoalTree`, `getHabitStats`, `getHabitsWithStatus`)
 * fetch rows and then run the exact same logic the SQLite backend used, so the
 * shapes returned to routes and components are identical.
 *
 * Differences handled here vs. SQLite:
 *   - jsonb columns round-trip as native objects/arrays (no JSON string work).
 *   - PATCH-style updates send only the provided keys instead of read-merge-write.
 */

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
import { supabase } from "./client";
import {
  type DomainRow,
  type GoalRow,
  type HabitLogRow,
  type HabitRow,
  type PushSubscriptionRow,
  type ReminderRow,
  type SettingRow,
  type TimeBlockRow,
  type BlockTemplateRow,
  rowToBlockTemplate,
  rowToDomain,
  rowToGoal,
  rowToHabit,
  rowToHabitLog,
  rowToPushSubscription,
  rowToReminder,
  rowToTimeBlock,
} from "./mappers";

/** Trailing window (days) the habit-stats history covers. */
const HISTORY_DAYS = 365;

/** Throw a descriptive error when a PostgREST call fails. */
function check(error: { message: string } | null, context: string): void {
  if (error) {
    throw new Error(`Supabase ${context} failed: ${error.message}`);
  }
}

export class SupabaseRepository implements Repository {
  // ─── Domains ──────────────────────────────────────────────────────────

  async listDomains(): Promise<Domain[]> {
    const { data, error } = await supabase
      .from("domains")
      .select("*")
      .order("sort_order")
      .order("created_at");
    check(error, "listDomains");
    return (data as DomainRow[]).map(rowToDomain);
  }

  async getDomain(id: string): Promise<Domain | null> {
    const { data, error } = await supabase
      .from("domains")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    check(error, "getDomain");
    return data ? rowToDomain(data as DomainRow) : null;
  }

  async createDomain(input: DomainInput): Promise<Domain> {
    const { data, error } = await supabase
      .from("domains")
      .insert({
        id: newId(),
        name: input.name,
        color: input.color,
        icon: input.icon,
        sort_order: input.sortOrder ?? 0,
        created_at: isoNow(),
      })
      .select()
      .single();
    check(error, "createDomain");
    return rowToDomain(data as DomainRow);
  }

  async updateDomain(id: string, patch: Patch<Domain>): Promise<Domain | null> {
    const next: Record<string, unknown> = {};
    if (patch.name !== undefined) next.name = patch.name;
    if (patch.color !== undefined) next.color = patch.color;
    if (patch.icon !== undefined) next.icon = patch.icon;
    if (patch.sortOrder !== undefined) next.sort_order = patch.sortOrder;
    if (Object.keys(next).length === 0) return this.getDomain(id);

    const { data, error } = await supabase
      .from("domains")
      .update(next)
      .eq("id", id)
      .select()
      .maybeSingle();
    check(error, "updateDomain");
    return data ? rowToDomain(data as DomainRow) : null;
  }

  async deleteDomain(id: string): Promise<void> {
    const { error } = await supabase.from("domains").delete().eq("id", id);
    check(error, "deleteDomain");
  }

  // ─── Goals ────────────────────────────────────────────────────────────

  async listGoals(filter?: GoalFilter): Promise<Goal[]> {
    let q = supabase.from("goals").select("*");
    if (filter?.level) q = q.eq("level", filter.level);
    if (filter?.status) q = q.eq("status", filter.status);
    if (filter?.domainId) q = q.eq("domain_id", filter.domainId);
    if (filter && "parentId" in filter) {
      q =
        filter.parentId === null
          ? q.is("parent_id", null)
          : q.eq("parent_id", filter.parentId as string);
    }
    const { data, error } = await q.order("sort_order").order("created_at");
    check(error, "listGoals");
    return (data as GoalRow[]).map(rowToGoal);
  }

  async getGoal(id: string): Promise<Goal | null> {
    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    check(error, "getGoal");
    return data ? rowToGoal(data as GoalRow) : null;
  }

  async getGoalTree(): Promise<GoalWithProgress[]> {
    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .order("sort_order")
      .order("created_at");
    check(error, "getGoalTree");
    const all = (data as GoalRow[]).map(rowToGoal);

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
    const { data, error } = await supabase
      .from("goals")
      .insert({
        id: newId(),
        level: input.level,
        title: input.title,
        description: input.description,
        parent_id: input.parentId,
        domain_id: input.domainId,
        target_date: input.targetDate,
        status: input.status ?? "active",
        progress: input.progress ?? null,
        sort_order: input.sortOrder ?? 0,
        created_at: isoNow(),
      })
      .select()
      .single();
    check(error, "createGoal");
    return rowToGoal(data as GoalRow);
  }

  async updateGoal(id: string, patch: Patch<Goal>): Promise<Goal | null> {
    const next: Record<string, unknown> = {};
    if (patch.level !== undefined) next.level = patch.level;
    if (patch.title !== undefined) next.title = patch.title;
    if (patch.description !== undefined) next.description = patch.description;
    if (patch.parentId !== undefined) next.parent_id = patch.parentId;
    if (patch.domainId !== undefined) next.domain_id = patch.domainId;
    if (patch.targetDate !== undefined) next.target_date = patch.targetDate;
    if (patch.status !== undefined) next.status = patch.status;
    if (patch.progress !== undefined) next.progress = patch.progress;
    if (patch.sortOrder !== undefined) next.sort_order = patch.sortOrder;
    if (Object.keys(next).length === 0) return this.getGoal(id);

    const { data, error } = await supabase
      .from("goals")
      .update(next)
      .eq("id", id)
      .select()
      .maybeSingle();
    check(error, "updateGoal");
    return data ? rowToGoal(data as GoalRow) : null;
  }

  async deleteGoal(id: string): Promise<void> {
    const { error } = await supabase.from("goals").delete().eq("id", id);
    check(error, "deleteGoal");
  }

  // ─── Habits ───────────────────────────────────────────────────────────

  async listHabits(opts?: { includeArchived?: boolean }): Promise<Habit[]> {
    let q = supabase.from("habits").select("*");
    if (!opts?.includeArchived) q = q.eq("archived", false);
    const { data, error } = await q.order("sort_order").order("created_at");
    check(error, "listHabits");
    return (data as HabitRow[]).map(rowToHabit);
  }

  async getHabit(id: string): Promise<Habit | null> {
    const { data, error } = await supabase
      .from("habits")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    check(error, "getHabit");
    return data ? rowToHabit(data as HabitRow) : null;
  }

  async createHabit(input: HabitInput): Promise<Habit> {
    const { data, error } = await supabase
      .from("habits")
      .insert({
        id: newId(),
        name: input.name,
        domain_id: input.domainId,
        frequency_type: input.frequencyType,
        frequency_config: input.frequencyConfig,
        target_value: input.targetValue,
        unit: input.unit,
        icon: input.icon,
        color: input.color,
        reminder_times: input.reminderTimes,
        archived: input.archived ?? false,
        sort_order: input.sortOrder ?? 0,
        created_at: isoNow(),
      })
      .select()
      .single();
    check(error, "createHabit");
    return rowToHabit(data as HabitRow);
  }

  async updateHabit(id: string, patch: Patch<Habit>): Promise<Habit | null> {
    const next: Record<string, unknown> = {};
    if (patch.name !== undefined) next.name = patch.name;
    if (patch.domainId !== undefined) next.domain_id = patch.domainId;
    if (patch.frequencyType !== undefined) next.frequency_type = patch.frequencyType;
    if (patch.frequencyConfig !== undefined) next.frequency_config = patch.frequencyConfig;
    if (patch.targetValue !== undefined) next.target_value = patch.targetValue;
    if (patch.unit !== undefined) next.unit = patch.unit;
    if (patch.icon !== undefined) next.icon = patch.icon;
    if (patch.color !== undefined) next.color = patch.color;
    if (patch.reminderTimes !== undefined) next.reminder_times = patch.reminderTimes;
    if (patch.archived !== undefined) next.archived = patch.archived;
    if (patch.sortOrder !== undefined) next.sort_order = patch.sortOrder;
    if (Object.keys(next).length === 0) return this.getHabit(id);

    const { data, error } = await supabase
      .from("habits")
      .update(next)
      .eq("id", id)
      .select()
      .maybeSingle();
    check(error, "updateHabit");
    return data ? rowToHabit(data as HabitRow) : null;
  }

  async deleteHabit(id: string): Promise<void> {
    const { error } = await supabase.from("habits").delete().eq("id", id);
    check(error, "deleteHabit");
  }

  // ─── Habit logs ───────────────────────────────────────────────────────

  async listHabitLogs(filter?: HabitLogFilter): Promise<HabitLog[]> {
    let q = supabase.from("habit_logs").select("*");
    if (filter?.habitId) q = q.eq("habit_id", filter.habitId);
    if (filter?.from) q = q.gte("date", filter.from);
    if (filter?.to) q = q.lte("date", filter.to);
    const { data, error } = await q.order("date");
    check(error, "listHabitLogs");
    return (data as HabitLogRow[]).map(rowToHabitLog);
  }

  async getHabitLog(habitId: string, date: string): Promise<HabitLog | null> {
    const { data, error } = await supabase
      .from("habit_logs")
      .select("*")
      .eq("habit_id", habitId)
      .eq("date", date)
      .maybeSingle();
    check(error, "getHabitLog");
    return data ? rowToHabitLog(data as HabitLogRow) : null;
  }

  async upsertHabitLog(input: HabitLogInput): Promise<HabitLog> {
    const { data, error } = await supabase
      .from("habit_logs")
      .upsert(
        {
          habit_id: input.habitId,
          date: input.date,
          value: input.value,
          completed: input.completed,
          note: input.note ?? null,
        },
        { onConflict: "habit_id,date" },
      )
      .select()
      .single();
    check(error, "upsertHabitLog");
    return rowToHabitLog(data as HabitLogRow);
  }

  async deleteHabitLog(id: string): Promise<void> {
    const { error } = await supabase.from("habit_logs").delete().eq("id", id);
    check(error, "deleteHabitLog");
  }

  // ─── Derived habit data ───────────────────────────────────────────────

  async getHabitStats(habitId: string, refDate: string): Promise<HabitStats> {
    const habit = await this.getHabit(habitId);
    if (!habit) {
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

    // Trailing 365 days up to and including refDate.
    const windowStart = shiftDate(refDate, -(HISTORY_DAYS - 1));
    const { data, error } = await supabase
      .from("habit_logs")
      .select("*")
      .eq("habit_id", habitId)
      .gte("date", windowStart)
      .lte("date", refDate);
    check(error, "getHabitStats");
    const logRows = data as HabitLogRow[];
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
    for (let i = 0; i < HISTORY_DAYS; i++) {
      if (cursor < windowStart) break;
      if (isDueDay(cursor)) {
        if (isCompleted(cursor)) {
          currentStreak++;
        } else if (cursor !== refDate) {
          break;
        }
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

    return Promise.all(
      habitList.map(async (habit): Promise<HabitWithStatus> => {
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
            const { data, error } = await supabase
              .from("habit_logs")
              .select("*")
              .eq("habit_id", habit.id)
              .gte("date", start)
              .lte("date", end);
            check(error, "getHabitsWithStatus");
            const weekLogs = data as HabitLogRow[];
            const completedThisWeek = weekLogs.filter(
              (l) => l.completed === true || l.value >= habit.targetValue,
            ).length;
            dueToday = completedThisWeek < target;
            break;
          }
        }

        const stats = await this.getHabitStats(habit.id, date);
        return { ...habit, todayLog, doneToday, dueToday, stats };
      }),
    );
  }

  // ─── Time blocks ──────────────────────────────────────────────────────

  async listTimeBlocks(date: string): Promise<TimeBlock[]> {
    const { data, error } = await supabase
      .from("time_blocks")
      .select("*")
      .eq("date", date)
      .order("start_time")
      .order("created_at");
    check(error, "listTimeBlocks");
    return (data as TimeBlockRow[]).map(rowToTimeBlock);
  }

  async getTimeBlock(id: string): Promise<TimeBlock | null> {
    const { data, error } = await supabase
      .from("time_blocks")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    check(error, "getTimeBlock");
    return data ? rowToTimeBlock(data as TimeBlockRow) : null;
  }

  async createTimeBlock(input: TimeBlockInput): Promise<TimeBlock> {
    const { data, error } = await supabase
      .from("time_blocks")
      .insert({
        id: newId(),
        date: input.date,
        start_time: input.startTime,
        end_time: input.endTime,
        title: input.title,
        habit_id: input.habitId,
        goal_id: input.goalId,
        color: input.color,
        created_at: isoNow(),
      })
      .select()
      .single();
    check(error, "createTimeBlock");
    return rowToTimeBlock(data as TimeBlockRow);
  }

  async updateTimeBlock(id: string, patch: Patch<TimeBlock>): Promise<TimeBlock | null> {
    const next: Record<string, unknown> = {};
    if (patch.date !== undefined) next.date = patch.date;
    if (patch.startTime !== undefined) next.start_time = patch.startTime;
    if (patch.endTime !== undefined) next.end_time = patch.endTime;
    if (patch.title !== undefined) next.title = patch.title;
    if (patch.habitId !== undefined) next.habit_id = patch.habitId;
    if (patch.goalId !== undefined) next.goal_id = patch.goalId;
    if (patch.color !== undefined) next.color = patch.color;
    if (Object.keys(next).length === 0) return this.getTimeBlock(id);

    const { data, error } = await supabase
      .from("time_blocks")
      .update(next)
      .eq("id", id)
      .select()
      .maybeSingle();
    check(error, "updateTimeBlock");
    return data ? rowToTimeBlock(data as TimeBlockRow) : null;
  }

  async deleteTimeBlock(id: string): Promise<void> {
    const { error } = await supabase.from("time_blocks").delete().eq("id", id);
    check(error, "deleteTimeBlock");
  }

  async applyTemplate(templateId: string, date: string): Promise<TimeBlock[]> {
    const template = await this.getTemplate(templateId);
    if (!template) return [];

    const rows = template.blocks.map((block) => ({
      id: newId(),
      date,
      start_time: block.startTime,
      end_time: block.endTime,
      title: block.title,
      habit_id: block.habitId,
      goal_id: block.goalId,
      color: block.color,
      created_at: isoNow(),
    }));
    if (rows.length === 0) return [];

    const { data, error } = await supabase.from("time_blocks").insert(rows).select();
    check(error, "applyTemplate");
    return (data as TimeBlockRow[]).map(rowToTimeBlock);
  }

  // ─── Block templates ──────────────────────────────────────────────────

  async listTemplates(): Promise<BlockTemplate[]> {
    const { data, error } = await supabase
      .from("block_templates")
      .select("*")
      .order("created_at");
    check(error, "listTemplates");
    return (data as BlockTemplateRow[]).map(rowToBlockTemplate);
  }

  async getTemplate(id: string): Promise<BlockTemplate | null> {
    const { data, error } = await supabase
      .from("block_templates")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    check(error, "getTemplate");
    return data ? rowToBlockTemplate(data as BlockTemplateRow) : null;
  }

  async createTemplate(input: BlockTemplateInput): Promise<BlockTemplate> {
    const { data, error } = await supabase
      .from("block_templates")
      .insert({
        id: newId(),
        name: input.name,
        blocks: input.blocks,
        created_at: isoNow(),
      })
      .select()
      .single();
    check(error, "createTemplate");
    return rowToBlockTemplate(data as BlockTemplateRow);
  }

  async updateTemplate(
    id: string,
    patch: Patch<BlockTemplate>,
  ): Promise<BlockTemplate | null> {
    const next: Record<string, unknown> = {};
    if (patch.name !== undefined) next.name = patch.name;
    if (patch.blocks !== undefined) next.blocks = patch.blocks;
    if (Object.keys(next).length === 0) return this.getTemplate(id);

    const { data, error } = await supabase
      .from("block_templates")
      .update(next)
      .eq("id", id)
      .select()
      .maybeSingle();
    check(error, "updateTemplate");
    return data ? rowToBlockTemplate(data as BlockTemplateRow) : null;
  }

  async deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase.from("block_templates").delete().eq("id", id);
    check(error, "deleteTemplate");
  }

  // ─── Reminders ────────────────────────────────────────────────────────

  async listReminders(filter?: ReminderFilter): Promise<Reminder[]> {
    let q = supabase.from("reminders").select("*");
    if (filter?.from) q = q.gte("scheduled_time", filter.from);
    if (filter?.to) q = q.lte("scheduled_time", filter.to);
    if (filter?.habitId) q = q.eq("habit_id", filter.habitId);
    if (filter?.unacknowledged) q = q.is("acknowledged_at", null);
    const { data, error } = await q.order("scheduled_time");
    check(error, "listReminders");
    return (data as ReminderRow[]).map(rowToReminder);
  }

  async getReminder(id: string): Promise<Reminder | null> {
    const { data, error } = await supabase
      .from("reminders")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    check(error, "getReminder");
    return data ? rowToReminder(data as ReminderRow) : null;
  }

  async createReminder(input: ReminderInput): Promise<Reminder> {
    const { data, error } = await supabase
      .from("reminders")
      .insert({
        id: newId(),
        habit_id: input.habitId,
        title: input.title,
        body: input.body,
        scheduled_time: input.scheduledTime,
        sent_at: input.sentAt ?? null,
        acknowledged_at: input.acknowledgedAt ?? null,
        snoozed_until: input.snoozedUntil ?? null,
        type: input.type,
        created_at: isoNow(),
      })
      .select()
      .single();
    check(error, "createReminder");
    return rowToReminder(data as ReminderRow);
  }

  async updateReminder(id: string, patch: Patch<Reminder>): Promise<Reminder | null> {
    const next: Record<string, unknown> = {};
    if (patch.habitId !== undefined) next.habit_id = patch.habitId;
    if (patch.title !== undefined) next.title = patch.title;
    if (patch.body !== undefined) next.body = patch.body;
    if (patch.scheduledTime !== undefined) next.scheduled_time = patch.scheduledTime;
    if (patch.sentAt !== undefined) next.sent_at = patch.sentAt;
    if (patch.acknowledgedAt !== undefined) next.acknowledged_at = patch.acknowledgedAt;
    if (patch.snoozedUntil !== undefined) next.snoozed_until = patch.snoozedUntil;
    if (patch.type !== undefined) next.type = patch.type;
    if (Object.keys(next).length === 0) return this.getReminder(id);

    const { data, error } = await supabase
      .from("reminders")
      .update(next)
      .eq("id", id)
      .select()
      .maybeSingle();
    check(error, "updateReminder");
    return data ? rowToReminder(data as ReminderRow) : null;
  }

  async deleteReminder(id: string): Promise<void> {
    const { error } = await supabase.from("reminders").delete().eq("id", id);
    check(error, "deleteReminder");
  }

  async getDueReminders(nowIso: string): Promise<Reminder[]> {
    const { data, error } = await supabase
      .from("reminders")
      .select("*")
      .lte("scheduled_time", nowIso)
      .is("acknowledged_at", null)
      .or(`snoozed_until.is.null,snoozed_until.lte.${nowIso}`)
      .order("scheduled_time");
    check(error, "getDueReminders");
    return (data as ReminderRow[]).map(rowToReminder);
  }

  // ─── Push subscriptions ───────────────────────────────────────────────

  async listPushSubscriptions(): Promise<PushSubscriptionRecord[]> {
    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .order("created_at");
    check(error, "listPushSubscriptions");
    return (data as PushSubscriptionRow[]).map(rowToPushSubscription);
  }

  async upsertPushSubscription(
    input: PushSubscriptionInput,
  ): Promise<PushSubscriptionRecord> {
    const { data, error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          endpoint: input.endpoint,
          p256dh: input.p256dh,
          auth: input.auth,
          user_agent: input.userAgent,
        },
        { onConflict: "endpoint" },
      )
      .select()
      .single();
    check(error, "upsertPushSubscription");
    return rowToPushSubscription(data as PushSubscriptionRow);
  }

  async deletePushSubscription(endpoint: string): Promise<void> {
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint);
    check(error, "deletePushSubscription");
  }

  // ─── Settings ─────────────────────────────────────────────────────────

  async getSettings(): Promise<AppSettings> {
    const { data, error } = await supabase.from("settings").select("*");
    check(error, "getSettings");
    const rows = data as SettingRow[];

    const merged: AppSettings = { ...DEFAULT_SETTINGS };
    const view = merged as unknown as Record<string, unknown>;
    for (const row of rows) {
      if (!(row.key in DEFAULT_SETTINGS)) continue;
      try {
        view[row.key] = JSON.parse(row.value) as unknown;
      } catch {
        /* skip malformed value */
      }
    }
    return merged;
  }

  async updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
    const rows = Object.entries(patch).map(([key, value]) => ({
      key,
      value: JSON.stringify(value),
    }));
    if (rows.length > 0) {
      const { error } = await supabase
        .from("settings")
        .upsert(rows, { onConflict: "key" });
      check(error, "updateSettings");
    }
    return this.getSettings();
  }
}
