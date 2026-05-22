import type { LucideIcon } from "lucide-react";

import { domainVisual, iconByName, type DomainVisual } from "@/lib/design";
import type { Domain, Habit, Reminder } from "@/lib/types";

/** A reminder paired with the visual treatment used to render it. */
export interface ReminderVisual {
  /** Domain accent colours + name for the reminder's habit. */
  domain: DomainVisual;
  /** Icon — the habit's own icon, falling back to the domain icon. */
  icon: LucideIcon;
}

/**
 * Resolve a reminder to its domain colours + icon. Habit-linked reminders use
 * the habit's domain and icon; custom reminders fall back to the career accent.
 */
export function reminderVisual(
  reminder: Reminder,
  habitsById: Map<string, Habit>,
  domainsById: Map<string, Domain>,
): ReminderVisual {
  const habit = reminder.habitId ? habitsById.get(reminder.habitId) : undefined;
  const domain = habit?.domainId ? domainsById.get(habit.domainId) : undefined;
  const visual = domainVisual(domain);
  return {
    domain: visual,
    icon: habit ? iconByName(habit.icon) : visual.icon,
  };
}

/** Extract the local "HH:MM" clock time from a reminder's ISO timestamp. */
export function reminderClock(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}
