/**
 * Health screen view-model. Turns the flat list of daily readings (as returned
 * by the repository / GET /api/health, oldest first) into one summary per
 * metric kind: latest value, day-over-day delta, and a short sparkline series.
 */

import { Footprints, HeartPulse, Moon, Scale, type LucideIcon } from "lucide-react";

import { HEALTH_METRICS, type HealthMetric, type HealthMetricKind } from "@/lib/types";

/** Points shown in a card's sparkline. */
const SPARK_DAYS = 14;

export interface HealthSeriesPoint {
  date: string;
  value: number;
}

export interface HealthMetricMeta {
  kind: HealthMetricKind;
  label: string;
  icon: LucideIcon;
  /** Accent hex for the icon tile + sparkline. */
  accent: string;
  defaultUnit: string;
  /** Which direction of change is an improvement (drives the delta color). */
  better: "up" | "down" | "neutral";
  formatValue: (value: number, unit: string) => { value: string; suffix?: string };
  formatDelta: (delta: number, unit: string) => string;
}

export interface HealthMetricSummary {
  meta: HealthMetricMeta;
  latest: HealthMetric | null;
  previous: HealthMetric | null;
  /** latest.value − previous.value, or null when there's no prior reading. */
  delta: number | null;
  /** Up to SPARK_DAYS most-recent points, oldest first. */
  series: HealthSeriesPoint[];
  unit: string;
}

function formatHours(h: number): string {
  let hrs = Math.floor(h);
  let mins = Math.round((h - hrs) * 60);
  if (mins === 60) {
    hrs += 1;
    mins = 0;
  }
  return mins ? `${hrs}h ${mins}m` : `${hrs}h`;
}

const sign = (n: number): string => (n > 0 ? "+" : n < 0 ? "−" : "");

/** Fixed display order, matching the request: sleep, weight, steps, resting HR. */
export const HEALTH_METRIC_META: HealthMetricMeta[] = [
  {
    kind: "sleep",
    label: "Sleep",
    icon: Moon,
    accent: "#4285F4",
    defaultUnit: "h",
    better: "up",
    formatValue: (v) => ({ value: formatHours(v) }),
    formatDelta: (d) => `${sign(d)}${formatHours(Math.abs(d))}`,
  },
  {
    kind: "weight",
    label: "Weight",
    icon: Scale,
    accent: "#00897B",
    defaultUnit: "kg",
    better: "neutral",
    formatValue: (v, unit) => ({ value: v.toFixed(1), suffix: unit }),
    formatDelta: (d, unit) => `${sign(d)}${Math.abs(d).toFixed(1)} ${unit}`,
  },
  {
    kind: "steps",
    label: "Steps",
    icon: Footprints,
    accent: "#34A853",
    defaultUnit: "steps",
    better: "up",
    formatValue: (v) => ({ value: Math.round(v).toLocaleString("en-US") }),
    formatDelta: (d) => `${sign(d)}${Math.round(Math.abs(d)).toLocaleString("en-US")}`,
  },
  {
    kind: "resting_hr",
    label: "Resting HR",
    icon: HeartPulse,
    accent: "#EA4335",
    defaultUnit: "bpm",
    better: "down",
    formatValue: (v) => ({ value: String(Math.round(v)), suffix: "bpm" }),
    formatDelta: (d) => `${sign(d)}${Math.round(Math.abs(d))} bpm`,
  },
];

export function computeHealthSummaries(metrics: HealthMetric[]): HealthMetricSummary[] {
  const byKind = new Map<HealthMetricKind, HealthMetric[]>();
  for (const k of HEALTH_METRICS) byKind.set(k, []);
  for (const m of metrics) byKind.get(m.metric)?.push(m);

  return HEALTH_METRIC_META.map((meta) => {
    const rows = byKind.get(meta.kind) ?? [];
    const latest = rows.at(-1) ?? null;
    const previous = rows.length > 1 ? (rows.at(-2) ?? null) : null;
    return {
      meta,
      latest,
      previous,
      delta: latest && previous ? latest.value - previous.value : null,
      series: rows.slice(-SPARK_DAYS).map((r) => ({ date: r.date, value: r.value })),
      unit: latest?.unit ?? meta.defaultUnit,
    };
  });
}

/** True when a delta moves in the metric's improving direction. */
export function isImprovement(meta: HealthMetricMeta, delta: number): boolean {
  if (meta.better === "up") return delta > 0;
  if (meta.better === "down") return delta < 0;
  return false;
}
