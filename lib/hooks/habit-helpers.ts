import type { Domain, Habit, HabitFrequencyConfig } from "@/lib/types";

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Human-readable description of a habit's frequency. */
export function frequencyLabel(
  type: Habit["frequencyType"],
  config: HabitFrequencyConfig,
): string {
  switch (type) {
    case "daily":
      return "Every day";
    case "weekly_count": {
      const n = config.timesPerWeek ?? 1;
      return `${n}× per week`;
    }
    case "specific_days": {
      const days = config.weekdays ?? [];
      if (days.length === 0) return "No days set";
      if (days.length === 7) return "Every day";
      return days
        .slice()
        .sort((a, b) => a - b)
        .map((d) => WEEKDAY_SHORT[d])
        .join(", ");
    }
    default:
      return "";
  }
}

/** A quantitative habit has a unit and a target above 1. */
export function isQuantitative(habit: Habit): boolean {
  return habit.unit.trim() !== "" && habit.targetValue > 1;
}

/** The effective accent color for a habit (its own, falling back to domain). */
export function habitColor(habit: Habit, domain: Domain | undefined): string {
  if (habit.color.trim() !== "") return habit.color;
  return domain?.color ?? "#6366f1";
}
