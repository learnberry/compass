/**
 * Small, dependency-free UI helpers for tinting components with a domain's
 * hex accent color (e.g. "#22c55e"). Used to render domain-colored chips,
 * cards and time blocks without hand-writing inline styles everywhere.
 */

import type { CSSProperties } from "react";

/** Convert a 3- or 6-digit hex color to an `rgba()` string with `alpha` (0-1). */
export function hexToRgba(hex: string, alpha: number): string {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) {
    // Fall back to a neutral transparent value for malformed input.
    return `rgba(0, 0, 0, ${clampAlpha(alpha)})`;
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${clampAlpha(alpha)})`;
}

function clampAlpha(a: number): number {
  if (Number.isNaN(a)) return 1;
  return Math.min(Math.max(a, 0), 1);
}

/** Inline-style fragments derived from a domain color. */
export interface DomainStyle {
  /** Solid accent — good for icons, dots, progress fills. */
  accent: CSSProperties;
  /** Translucent tinted background — good for chips/cards. */
  tint: CSSProperties;
  /** Translucent background plus a matching border and solid text color. */
  surface: CSSProperties;
  /** The raw color, unchanged. */
  color: string;
}

/**
 * Produce reusable inline styles for a domain's hex `color`.
 *
 * @example
 *   const s = domainStyle(domain.color);
 *   <div style={s.surface}>…</div>
 *   <span style={s.accent} />
 */
export function domainStyle(color: string): DomainStyle {
  return {
    color,
    accent: { backgroundColor: color, color },
    tint: { backgroundColor: hexToRgba(color, 0.12) },
    surface: {
      backgroundColor: hexToRgba(color, 0.12),
      borderColor: hexToRgba(color, 0.35),
      color,
    },
  };
}

/** CSS custom properties exposing a domain color for use in className styles. */
export function domainVars(color: string): CSSProperties {
  return {
    ["--domain" as string]: color,
    ["--domain-tint" as string]: hexToRgba(color, 0.12),
    ["--domain-border" as string]: hexToRgba(color, 0.35),
  };
}
