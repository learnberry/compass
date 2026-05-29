/** App-wide constants. */

export const APP_NAME = "Compass";
export const APP_DESCRIPTION =
  "Your personal compass — habits, schedule, goals, and reminders in one place.";

/** Brand accent (Career blue) — used to render the PWA app icons. */
export const BRAND_COLOR = "#4285F4";

/** Snooze options surfaced on reminders, in minutes. `-1` means "tomorrow". */
export const SNOOZE_OPTIONS = [
  { label: "10 min", minutes: 10 },
  { label: "1 hour", minutes: 60 },
  { label: "Tomorrow", minutes: -1 },
] as const;
