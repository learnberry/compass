import { withAlpha } from "@/lib/design";
import { format, parseISO, shiftDate, todayStr } from "@/lib/dates";
import { cn } from "@/lib/utils";

import {
  isImprovement,
  type HealthMetricSummary,
  type HealthSeriesPoint,
} from "@/components/features/health/health-metrics";

function asOfLabel(date: string): string {
  const today = todayStr();
  if (date === today) return "Today";
  if (date === shiftDate(today, -1)) return "Yesterday";
  return format(parseISO(date), "EEE, d MMM");
}

function Sparkline({ points, accent }: { points: HealthSeriesPoint[]; accent: string }) {
  const values = points.map((p) => p.value);
  const max = Math.max(...values);
  const min = Math.min(...values);

  return (
    <div className="mt-3.5 flex h-9 items-end gap-[3px]">
      {points.map((p, i) => {
        const ratio = max > min ? (p.value - min) / (max - min) : 1;
        const last = i === points.length - 1;
        return (
          <div
            key={p.date}
            className="flex-1 rounded-[3px] rounded-b-none"
            style={{
              height: `${18 + ratio * 82}%`,
              background: last ? accent : withAlpha(accent, 0.4),
            }}
          />
        );
      })}
    </div>
  );
}

/** One health metric: icon, latest value, day-over-day delta, and a sparkline. */
export function HealthMetricCard({ summary }: { summary: HealthMetricSummary }) {
  const { meta, latest, delta, series, unit } = summary;
  const Icon = meta.icon;
  const shown = latest ? meta.formatValue(latest.value, unit) : null;

  const good = delta != null && isImprovement(meta, delta);
  const arrow = delta == null ? "" : delta > 0 ? "↑" : delta < 0 ? "↓" : "→";

  return (
    <div className="rounded-card border border-hairline bg-surface p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className="flex size-8 items-center justify-center rounded-[10px]"
            style={{ background: withAlpha(meta.accent, 0.12) }}
          >
            <Icon className="size-[18px]" style={{ color: meta.accent }} strokeWidth={1.9} />
          </span>
          <span className="text-[13px] font-semibold tracking-[-0.1px] text-ink">
            {meta.label}
          </span>
        </div>
        {delta != null && (
          <span
            className={cn(
              "text-[11px] font-semibold tnum",
              good ? "text-creative" : "text-ink-2",
            )}
          >
            {arrow} {meta.formatDelta(delta, unit)}
          </span>
        )}
      </div>

      {shown ? (
        <>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-[30px] font-bold leading-none tracking-[-0.7px] text-ink tnum">
              {shown.value}
            </span>
            {shown.suffix && (
              <span className="text-[14px] font-semibold text-ink-2">{shown.suffix}</span>
            )}
          </div>
          <div className="mt-1 text-[11px] font-medium text-ink-3">
            as of {asOfLabel(latest!.date)}
          </div>
          {series.length > 1 && <Sparkline points={series} accent={meta.accent} />}
        </>
      ) : (
        <div className="mt-3 text-[13px] font-medium text-ink-3">No data yet</div>
      )}
    </div>
  );
}
