/**
 * Seed the Compass database.
 *
 * Run with:  pnpm db:seed
 *
 * Repeatable: wipes every table, then inserts a fresh dataset — domains,
 * habits with ~240 days of synthesized history (so streaks, heatmaps and
 * completion rates are populated), the goal hierarchy, schedule templates,
 * today's time blocks, a few reminders, and settings.
 */

import {
  DEFAULT_DOMAINS,
  SEED_GOALS,
  SEED_HABITS,
  SEED_TEMPLATES,
  SEED_TODAY_TEMPLATE,
  type HabitSeed,
} from "../lib/constants";
import { isoNow, shiftDate, todayStr } from "../lib/dates";
import { db, sqlite } from "../lib/db/sqlite/client";
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
} from "../lib/db/schema";
import { DEFAULT_SETTINGS, type TemplateBlock } from "../lib/types";
import { newId } from "../lib/utils";

/** Days of habit history to synthesize. */
const HISTORY_DAYS = 240;

/** Deterministic PRNG so re-seeds produce the same demo data. */
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/** Decide whether a habit is "completed" on a given day offset (0 = today). */
function isCompletedOnOffset(h: HabitSeed, offset: number, rng: () => number): boolean {
  const { seedStreak: streak, seedDoneToday: doneToday } = h;
  if (doneToday) {
    if (offset < streak) return true;
    if (offset === streak) return false; // streak-breaking gap
  } else {
    if (offset === 0) return false; // today not done yet
    if (offset <= streak) return true;
    if (offset === streak + 1) return false;
  }
  return rng() < 0.72; // older days
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function main(): void {
  console.log("Seeding Compass database ...");

  // ─── Wipe (children before parents) ────────────────────────────────────
  db.delete(habitLogs).run();
  db.delete(timeBlocks).run();
  db.delete(reminders).run();
  db.delete(blockTemplates).run();
  db.delete(goals).run();
  db.delete(habits).run();
  db.delete(pushSubscriptions).run();
  db.delete(settings).run();
  db.delete(domains).run();

  const now = isoNow();
  const today = todayStr();
  const createdAt = `${shiftDate(today, -HISTORY_DAYS)}T08:00:00.000Z`;

  // ─── Domains ───────────────────────────────────────────────────────────
  const domainId = new Map<string, string>();
  const domainColor = new Map<string, string>();
  DEFAULT_DOMAINS.forEach((d, i) => {
    const id = newId();
    domainId.set(d.name, id);
    domainColor.set(d.name, d.color);
    db.insert(domains)
      .values({ id, name: d.name, color: d.color, icon: d.icon, sortOrder: i, createdAt: now })
      .run();
  });

  // ─── Habits + synthesized history ──────────────────────────────────────
  const habitId = new Map<string, string>();
  let logCount = 0;
  SEED_HABITS.forEach((h, i) => {
    const id = newId();
    habitId.set(h.name, id);
    db.insert(habits)
      .values({
        id,
        name: h.name,
        domainId: domainId.get(h.domain) ?? null,
        frequencyType: h.frequencyType,
        frequencyConfig: JSON.stringify(h.frequencyConfig),
        targetValue: h.targetValue,
        unit: h.unit,
        icon: h.icon,
        color: "", // empty => UI falls back to the domain color
        reminderTimes: JSON.stringify(h.reminderTimes),
        archived: false,
        sortOrder: i,
        createdAt,
      })
      .run();

    const rng = makeRng(1000 + i * 97);
    const isWater = h.name === "Drink water";
    for (let off = 0; off < HISTORY_DAYS; off++) {
      const completed = isCompletedOnOffset(h, off, rng);
      let value: number;
      if (isWater) {
        value =
          off === 0
            ? 1.8
            : completed
              ? round1(3 + rng() * 0.5)
              : round1(0.6 + rng() * 1.7);
      } else {
        value = completed ? h.targetValue : 0;
      }
      db.insert(habitLogs)
        .values({
          id: newId(),
          habitId: id,
          date: shiftDate(today, -off),
          value,
          completed: isWater ? value >= h.targetValue : completed,
          note: null,
          createdAt: now,
        })
        .run();
      logCount += 1;
    }
  });

  // ─── Goals (parents inserted before children) ──────────────────────────
  const goalId = new Map<string, string>();
  SEED_GOALS.forEach((g, i) => {
    const id = newId();
    goalId.set(g.title, id);
    db.insert(goals)
      .values({
        id,
        level: g.level,
        title: g.title,
        description: g.description ?? null,
        parentId: g.parent ? (goalId.get(g.parent) ?? null) : null,
        domainId: domainId.get(g.domain) ?? null,
        targetDate: g.targetDate ?? null,
        status: g.progress === 100 ? "done" : "active",
        progress: g.progress ?? null,
        sortOrder: i,
        createdAt: now,
      })
      .run();
  });

  // ─── Templates ─────────────────────────────────────────────────────────
  SEED_TEMPLATES.forEach((t) => {
    const blocks: TemplateBlock[] = t.blocks.map((b) => ({
      startTime: b.startTime,
      endTime: b.endTime,
      title: b.title,
      color: domainColor.get(b.domain) ?? "",
      habitId: b.habit ? (habitId.get(b.habit) ?? null) : null,
      goalId: null,
    }));
    db.insert(blockTemplates)
      .values({ id: newId(), name: t.name, blocks: JSON.stringify(blocks), createdAt: now })
      .run();
  });

  // ─── Today's time blocks (from the weekday template) ───────────────────
  const todayTemplate = SEED_TEMPLATES.find((t) => t.name === SEED_TODAY_TEMPLATE);
  let blockCount = 0;
  todayTemplate?.blocks.forEach((b) => {
    db.insert(timeBlocks)
      .values({
        id: newId(),
        date: today,
        startTime: b.startTime,
        endTime: b.endTime,
        title: b.title,
        habitId: b.habit ? (habitId.get(b.habit) ?? null) : null,
        goalId: null,
        color: domainColor.get(b.domain) ?? "",
        createdAt: now,
      })
      .run();
    blockCount += 1;
  });

  // ─── Reminders for today ───────────────────────────────────────────────
  const at = (time: string): string => new Date(`${today}T${time}:00`).toISOString();
  const seedReminders = [
    { time: "12:00", habit: null, title: "Lunch + walk", body: "Step away from screens", type: "custom" as const },
    { time: "14:00", habit: "Drink water", title: "Time to drink water", body: "You're at 1.8 L · 1.2 L to go", type: "habit" as const },
    { time: "16:30", habit: "Tennis", title: "Tennis @ club in 30 min", body: "Pack racket + water · Block 17:00–18:30", type: "habit" as const },
    { time: "19:00", habit: "Study Japanese", title: "Study Japanese", body: "Anki + reading · 30 min", type: "habit" as const },
  ];
  seedReminders.forEach((r) => {
    db.insert(reminders)
      .values({
        id: newId(),
        habitId: r.habit ? (habitId.get(r.habit) ?? null) : null,
        title: r.title,
        body: r.body,
        scheduledTime: at(r.time),
        sentAt: null,
        acknowledgedAt: null,
        snoozedUntil: null,
        type: r.type,
        createdAt: now,
      })
      .run();
  });

  // ─── Settings ──────────────────────────────────────────────────────────
  const seededSettings = {
    ...DEFAULT_SETTINGS,
    theme: "light" as const,
    waterHabitId: habitId.get("Drink water") ?? null,
  };
  for (const [key, value] of Object.entries(seededSettings)) {
    db.insert(settings).values({ key, value: JSON.stringify(value) }).run();
  }

  console.log(
    `Seeded: ${DEFAULT_DOMAINS.length} domains, ${SEED_HABITS.length} habits, ` +
      `${logCount} habit logs, ${SEED_GOALS.length} goals, ${SEED_TEMPLATES.length} templates, ` +
      `${blockCount} time blocks, ${seedReminders.length} reminders.`,
  );

  sqlite.close();
}

main();
