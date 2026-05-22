/**
 * App-wide constants and seed definitions.
 *
 * Aligned to design_handoff_compass — six life domains, the Material accent
 * palette, and the habit/goal/schedule data shown in the v1 mocks. The seed
 * script (scripts/seed.ts) resolves the name references below to ids.
 */

import type { GoalLevel, HabitFrequencyConfig, HabitFrequencyType } from "./types";

export const APP_NAME = "Compass";
export const APP_DESCRIPTION =
  "Your personal compass — habits, schedule, goals, and reminders in one place.";

/** Brand accent (Career blue) — PWA theme, FABs, primary actions. */
export const BRAND_COLOR = "#4285F4";

// ─── Default life domains (handoff palette) ────────────────────────────

export interface DomainSeed {
  name: string;
  /** Hex accent color. */
  color: string;
  /** lucide-react icon name. */
  icon: string;
}

export const DEFAULT_DOMAINS: DomainSeed[] = [
  { name: "Health", color: "#EA4335", icon: "Dumbbell" },
  { name: "Career", color: "#4285F4", icon: "Briefcase" },
  { name: "Learning", color: "#FBBC04", icon: "BookOpen" },
  { name: "Creative", color: "#34A853", icon: "Cookie" },
  { name: "Relationships", color: "#FF7043", icon: "Heart" },
  { name: "Finance", color: "#00897B", icon: "DollarSign" },
];

// ─── Seed habits ───────────────────────────────────────────────────────

export interface HabitSeed {
  name: string;
  domain: string;
  frequencyType: HabitFrequencyType;
  frequencyConfig: HabitFrequencyConfig;
  targetValue: number;
  unit: string;
  icon: string;
  reminderTimes: string[];
  /** Approximate current streak to synthesize in seed history. */
  seedStreak: number;
  /** Whether the habit is logged complete for "today" in seed history. */
  seedDoneToday: boolean;
}

export const SEED_HABITS: HabitSeed[] = [
  {
    name: "Workout",
    domain: "Health",
    frequencyType: "daily",
    frequencyConfig: {},
    targetValue: 45,
    unit: "min",
    icon: "Dumbbell",
    reminderTimes: ["07:00"],
    seedStreak: 47,
    seedDoneToday: true,
  },
  {
    name: "Study Japanese",
    domain: "Learning",
    frequencyType: "daily",
    frequencyConfig: {},
    targetValue: 30,
    unit: "min",
    icon: "BookOpen",
    reminderTimes: ["19:00"],
    seedStreak: 128,
    seedDoneToday: true,
  },
  {
    name: "Tennis",
    domain: "Relationships",
    frequencyType: "weekly_count",
    frequencyConfig: { timesPerWeek: 2 },
    targetValue: 1,
    unit: "hour",
    icon: "Activity",
    reminderTimes: ["18:00"],
    seedStreak: 12,
    seedDoneToday: false,
  },
  {
    name: "Work on business",
    domain: "Career",
    frequencyType: "daily",
    frequencyConfig: {},
    targetValue: 2,
    unit: "hours",
    icon: "Briefcase",
    reminderTimes: ["20:00"],
    seedStreak: 38,
    seedDoneToday: true,
  },
  {
    name: "Bake",
    domain: "Creative",
    frequencyType: "weekly_count",
    frequencyConfig: { timesPerWeek: 1 },
    targetValue: 1,
    unit: "loaf",
    icon: "Cookie",
    reminderTimes: [],
    seedStreak: 3,
    seedDoneToday: false,
  },
  {
    name: "Drink water",
    domain: "Health",
    frequencyType: "daily",
    frequencyConfig: {},
    targetValue: 3,
    unit: "L",
    icon: "Droplet",
    reminderTimes: ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"],
    seedStreak: 22,
    seedDoneToday: false,
  },
];

// ─── Seed schedule templates ───────────────────────────────────────────

export interface TemplateBlockSeed {
  startTime: string;
  endTime: string;
  title: string;
  domain: string;
  habit?: string;
}

export interface TemplateSeed {
  name: string;
  blocks: TemplateBlockSeed[];
}

export const SEED_TEMPLATES: TemplateSeed[] = [
  {
    name: "Weekday",
    blocks: [
      { startTime: "06:00", endTime: "07:00", title: "Morning routine", domain: "Health" },
      { startTime: "07:30", endTime: "08:30", title: "Workout", domain: "Health", habit: "Workout" },
      { startTime: "09:00", endTime: "12:00", title: "Day job — deep work", domain: "Career" },
      { startTime: "12:00", endTime: "13:00", title: "Lunch + walk", domain: "Relationships" },
      { startTime: "13:00", endTime: "15:00", title: "Day job — meetings", domain: "Career" },
      { startTime: "15:30", endTime: "16:30", title: "Japanese — Anki + reading", domain: "Learning", habit: "Study Japanese" },
      { startTime: "17:00", endTime: "18:30", title: "Tennis @ club", domain: "Relationships", habit: "Tennis" },
      { startTime: "19:00", endTime: "20:30", title: "Bake sourdough", domain: "Creative", habit: "Bake" },
      { startTime: "21:00", endTime: "22:00", title: "Read + wind down", domain: "Learning" },
    ],
  },
  {
    name: "Weekend",
    blocks: [
      { startTime: "08:00", endTime: "09:30", title: "Slow morning", domain: "Health" },
      { startTime: "09:30", endTime: "11:00", title: "Long run", domain: "Health", habit: "Workout" },
      { startTime: "11:00", endTime: "12:30", title: "Bake sourdough", domain: "Creative", habit: "Bake" },
      { startTime: "12:30", endTime: "13:30", title: "Lunch", domain: "Relationships" },
      { startTime: "14:00", endTime: "16:00", title: "Work on business", domain: "Career", habit: "Work on business" },
      { startTime: "16:00", endTime: "18:00", title: "Friends + family", domain: "Relationships" },
      { startTime: "19:00", endTime: "19:30", title: "Study Japanese", domain: "Learning", habit: "Study Japanese" },
      { startTime: "20:00", endTime: "22:00", title: "Relax + unwind", domain: "Creative" },
    ],
  },
];

/** The template instantiated onto "today" by the seed script. */
export const SEED_TODAY_TEMPLATE = "Weekday";

// ─── Seed goals (life → yearly → monthly → daily) ──────────────────────

export interface GoalSeed {
  level: GoalLevel;
  title: string;
  description?: string;
  domain: string;
  /** Title of the parent goal — resolved at seed time. */
  parent?: string;
  /** Manual progress 0-100. Omit to roll up from children. */
  progress?: number;
  /** "YYYY-MM-DD" target date, or omit for an open-ended goal. */
  targetDate?: string;
}

export const SEED_GOALS: GoalSeed[] = [
  // Life
  { level: "life", title: "Build a profitable business", domain: "Career",
    description: "A business that funds the life I want." },
  { level: "life", title: "Be strong and healthy for life", domain: "Health",
    description: "Lifelong fitness, energy, and resilience." },
  { level: "life", title: "Become fluent in Japanese", domain: "Learning",
    description: "Hold a real, easy conversation in Japanese." },
  { level: "life", title: "Make things with my hands", domain: "Creative",
    description: "Keep a steady creative practice going." },

  // Yearly
  { level: "yearly", title: "Launch business v1", domain: "Career",
    parent: "Build a profitable business", progress: 64, targetDate: "2026-09-30" },
  { level: "yearly", title: "Run a half marathon", domain: "Health",
    parent: "Be strong and healthy for life", progress: 38, targetDate: "2026-11-12" },
  { level: "yearly", title: "Pass JLPT N3", domain: "Learning",
    parent: "Become fluent in Japanese", progress: 41, targetDate: "2026-12-07" },
  { level: "yearly", title: "Bake 30 sourdoughs", domain: "Creative",
    parent: "Make things with my hands", progress: 23, targetDate: "2026-12-31" },

  // Monthly
  { level: "monthly", title: "Ship beta to 10 testers", domain: "Career",
    parent: "Launch business v1", progress: 80, targetDate: "2026-06-15" },
  { level: "monthly", title: "First 100 paying users", domain: "Career",
    parent: "Launch business v1", progress: 22, targetDate: "2026-08-30" },
  { level: "monthly", title: "Marketing site live", domain: "Career",
    parent: "Launch business v1", progress: 100, targetDate: "2026-05-10" },
  { level: "monthly", title: "Long run 15 km by July", domain: "Health",
    parent: "Run a half marathon", progress: 60, targetDate: "2026-07-31" },
  { level: "monthly", title: "Average 30 km / week", domain: "Health",
    parent: "Run a half marathon", progress: 45 },
  { level: "monthly", title: "Learn 500 new vocab", domain: "Learning",
    parent: "Pass JLPT N3", progress: 64, targetDate: "2026-05-31" },
  { level: "monthly", title: "Finish Genki II", domain: "Learning",
    parent: "Pass JLPT N3", progress: 38, targetDate: "2026-08-01" },

  // Daily
  { level: "daily", title: "Study Japanese 30 min", domain: "Learning",
    parent: "Learn 500 new vocab", progress: 0 },
  { level: "daily", title: "Work on business 1 hour", domain: "Career",
    parent: "Ship beta to 10 testers", progress: 0 },
  { level: "daily", title: "Move my body today", domain: "Health",
    parent: "Long run 15 km by July", progress: 0 },
];

/** Snooze options surfaced on reminders, in minutes. `-1` means "tomorrow". */
export const SNOOZE_OPTIONS = [
  { label: "10 min", minutes: 10 },
  { label: "1 hour", minutes: 60 },
  { label: "Tomorrow", minutes: -1 },
] as const;
