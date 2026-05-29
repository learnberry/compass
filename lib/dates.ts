/**
 * Date helpers. Compass stores calendar dates as "YYYY-MM-DD" strings.
 *
 * "Today" and "now" are anchored to a single fixed timezone
 * (NEXT_PUBLIC_APP_TIMEZONE) so the server (which runs in UTC on Vercel) and the
 * browser always agree on which calendar day it is — otherwise a log written by
 * the browser lands on a different date than the one a server component reads.
 * The string-math helpers below stay timezone-neutral: they parse a date string
 * to local midnight and format it back, which round-trips regardless of offset.
 */

import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  format,
  parseISO,
  startOfWeek,
  subDays,
} from "date-fns";

/** Fixed timezone the whole app treats as "local". Unset → runtime local time. */
const APP_TZ = process.env.NEXT_PUBLIC_APP_TIMEZONE;

/** Date/time field values for an instant, projected into a timezone. */
function partsInTz(d: Date, timeZone: string): Record<string, string> {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const out: Record<string, string> = {};
  for (const p of parts) out[p.type] = p.value;
  return out;
}

/** "YYYY-MM-DD" for a Date (runtime local time). */
export function dateStr(d: Date = new Date()): string {
  return format(d, "yyyy-MM-dd");
}

/** Today as "YYYY-MM-DD" in the app timezone (consistent server + client). */
export function todayStr(): string {
  if (!APP_TZ) return dateStr(new Date());
  const p = partsInTz(new Date(), APP_TZ);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Parse a "YYYY-MM-DD" string to a local Date at midnight. */
export function parseDate(s: string): Date {
  return parseISO(s);
}

/** Current instant as an ISO-8601 timestamp. */
export function isoNow(): string {
  return new Date().toISOString();
}

/** Shift a "YYYY-MM-DD" string by `n` days (negative goes back). */
export function shiftDate(s: string, n: number): string {
  return dateStr(addDays(parseDate(s), n));
}

/** Weekday index for a date string: 0 = Sunday … 6 = Saturday. */
export function weekdayOf(s: string): number {
  return parseDate(s).getDay();
}

/** Whether a date string falls on Sat/Sun. */
export function isWeekend(s: string): boolean {
  const d = weekdayOf(s);
  return d === 0 || d === 6;
}

/** Inclusive list of "YYYY-MM-DD" strings between two date strings. */
export function dateRange(from: string, to: string): string[] {
  return eachDayOfInterval({ start: parseDate(from), end: parseDate(to) }).map((d) =>
    dateStr(d),
  );
}

/** The `n` most recent date strings ending today (oldest first). */
export function lastNDays(n: number, end: string = todayStr()): string[] {
  return dateRange(shiftDate(end, -(n - 1)), end);
}

/** Whole days between two date strings (b - a). */
export function daysBetween(a: string, b: string): number {
  return differenceInCalendarDays(parseDate(b), parseDate(a));
}

/** Monday-of-the-week date string for a given date. */
export function weekStart(s: string = todayStr()): string {
  return dateStr(startOfWeek(parseDate(s), { weekStartsOn: 1 }));
}

/** "Mon", "Tue", … for a date string. */
export function weekdayLabel(s: string): string {
  return format(parseDate(s), "EEE");
}

/** Friendly header date, e.g. "Wednesday, 21 May". */
export function longDate(s: string = todayStr()): string {
  return format(parseDate(s), "EEEE, d MMMM");
}

/** Minutes since midnight for a "HH:MM" clock string. */
export function clockToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** "HH:MM" for a count of minutes since midnight. */
export function minutesToClock(mins: number): string {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** 12-hour display for a "HH:MM" string, e.g. "7:00 AM". */
export function formatClock12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

/** Current "HH:MM" clock string in the app timezone. */
export function nowClock(): string {
  if (!APP_TZ) return format(new Date(), "HH:mm");
  const p = partsInTz(new Date(), APP_TZ);
  return `${p.hour}:${p.minute}`;
}

export { addDays, subDays, format, parseISO };
