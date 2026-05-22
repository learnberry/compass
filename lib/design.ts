/**
 * Compass design system — the handoff palette, domain visuals, and icon
 * registry. Authoritative per design_handoff_compass/README.md.
 *
 * Tailwind utilities for these colors (bg-canvas, text-ink-2, bg-health-tint,
 * rounded-card, …) are generated from app/globals.css. This module exposes the
 * same values to TypeScript for SVG/canvas/inline-style use.
 */

import {
  Activity,
  BookOpen,
  Bell,
  Briefcase,
  Calendar,
  Check,
  CircleCheck,
  Clock,
  Compass,
  Cookie,
  DollarSign,
  Droplet,
  Dumbbell,
  Flame,
  Heart,
  LineChart,
  type LucideIcon,
  Moon,
  Music,
  PenLine,
  Sparkles,
  Sprout,
  Target,
  Trophy,
  Wallet,
} from "lucide-react";

// ─── Neutral surfaces / ink scale ──────────────────────────────────────

export const COLORS = {
  canvas: "#F8F9FA",
  surface: "#FFFFFF",
  hairline: "#E8EAED",
  divider: "#F1F3F4",
  ink: "#202124",
  ink2: "#5F6368",
  ink3: "#9AA0A6",
  ink4: "#BDC1C6",
  /** Empty heatmap / grid cell. */
  cellEmpty: "#EEF1F4",
} as const;

// ─── Domains ───────────────────────────────────────────────────────────

export type DomainKey =
  | "health"
  | "career"
  | "learning"
  | "creative"
  | "relationships"
  | "finance";

export interface DomainVisual {
  key: DomainKey;
  name: string;
  /** Solid accent — stripes, icons, active states. */
  solid: string;
  /** Tint — icon-tile and banner backgrounds. */
  tint: string;
  icon: LucideIcon;
}

export const DOMAIN_PALETTE: Record<DomainKey, DomainVisual> = {
  health: { key: "health", name: "Health", solid: "#EA4335", tint: "#FCE8E6", icon: Dumbbell },
  career: { key: "career", name: "Career", solid: "#4285F4", tint: "#E8F0FE", icon: Briefcase },
  learning: { key: "learning", name: "Learning", solid: "#FBBC04", tint: "#FEF7E0", icon: BookOpen },
  creative: { key: "creative", name: "Creative", solid: "#34A853", tint: "#E6F4EA", icon: Cookie },
  relationships: { key: "relationships", name: "Relationships", solid: "#FF7043", tint: "#FFE9E0", icon: Heart },
  finance: { key: "finance", name: "Finance", solid: "#00897B", tint: "#E0F2F1", icon: DollarSign },
};

export const DOMAIN_ORDER: DomainKey[] = [
  "health",
  "career",
  "learning",
  "creative",
  "relationships",
  "finance",
];

/** Functional UI accents. */
export const PRIMARY = DOMAIN_PALETTE.career.solid; // #4285F4
export const SUCCESS = DOMAIN_PALETTE.creative.solid; // #34A853
export const ALERT = DOMAIN_PALETTE.health.solid; // #EA4335

/** Normalize a free-text domain name to a palette key, or null when unknown. */
export function domainKeyFromName(name: string | null | undefined): DomainKey | null {
  if (!name) return null;
  const k = name.trim().toLowerCase();
  if (k in DOMAIN_PALETTE) return k as DomainKey;
  return null;
}

/**
 * Resolve a database Domain (or null) to its visual treatment. Known domains
 * use the authoritative handoff palette; unknown ones fall back to the domain's
 * own stored color with a derived tint.
 */
export function domainVisual(
  domain: { name?: string | null; color?: string | null; icon?: string | null } | null | undefined,
): DomainVisual {
  const key = domainKeyFromName(domain?.name);
  if (key) return DOMAIN_PALETTE[key];

  const solid = domain?.color || PRIMARY;
  return {
    key: "career",
    name: domain?.name || "General",
    solid,
    tint: mixWhite(solid, 0.14),
    icon: iconByName(domain?.icon),
  };
}

// ─── Icon registry ─────────────────────────────────────────────────────

/** Names available to the habit icon picker and stored in `habit.icon`. */
export const ICON_REGISTRY: Record<string, LucideIcon> = {
  Dumbbell,
  BookOpen,
  Activity,
  Briefcase,
  Cookie,
  Droplet,
  Heart,
  DollarSign,
  Target,
  Flame,
  Clock,
  Calendar,
  Compass,
  Trophy,
  Sparkles,
  LineChart,
  PenLine,
  Music,
  Sprout,
  Wallet,
  Moon,
  Bell,
  Check,
  CircleCheck,
};

/** Curated set offered in the habit icon picker. */
export const HABIT_ICON_CHOICES: string[] = [
  "Dumbbell",
  "Activity",
  "BookOpen",
  "Briefcase",
  "Cookie",
  "Droplet",
  "Heart",
  "DollarSign",
  "Target",
  "PenLine",
  "Music",
  "Sprout",
  "Compass",
  "Sparkles",
  "Clock",
  "Moon",
];

/** Resolve a stored icon name to a Lucide component, with a safe fallback. */
export function iconByName(name: string | null | undefined): LucideIcon {
  return (name && ICON_REGISTRY[name]) || CircleCheck;
}

// ─── Color math ────────────────────────────────────────────────────────

/** Parse a #rrggbb / #rgb hex string to an [r,g,b] triple. */
function parseHex(hex: string): [number, number, number] {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = Number.parseInt(h || "000000", 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Mix a hex color toward white. `alpha` is the weight of the original color
 * (1 = original, 0 = white). Used for heatmap intensity levels.
 */
export function mixWhite(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex);
  const mix = (c: number) => Math.round(c * alpha + 255 * (1 - alpha));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

/** Hex color as an `rgba()` string at the given opacity. */
export function withAlpha(hex: string, opacity: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/** Heatmap fill for a 0–4 intensity level in a domain color. */
export function heatmapColor(domainSolid: string, level: number): string {
  if (level <= 0) return COLORS.cellEmpty;
  const steps = [0.25, 0.5, 0.75, 1];
  return mixWhite(domainSolid, steps[Math.min(level, 4) - 1]);
}
