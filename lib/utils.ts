import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware className combiner used by every UI component. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** A fresh UUID. Works in Node and the browser. */
export function newId(): string {
  return crypto.randomUUID();
}

/** Clamp `n` into the inclusive [min, max] range. */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

/** Percentage of `value` out of `total`, clamped to 0-100. Safe when total is 0. */
export function percent(value: number, total: number): number {
  if (total <= 0) return 0;
  return clamp(Math.round((value / total) * 100), 0, 100);
}

/** Round to at most `places` decimals, dropping trailing zeros. */
export function round(n: number, places = 1): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

/** Trigger a short haptic tap on devices that support it (mostly Android). */
export function haptic(pattern: number | number[] = 10): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* vibration not allowed — ignore */
    }
  }
}
