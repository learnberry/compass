import { HeartPulse } from "lucide-react";

import { HealthMetricCard } from "@/components/features/health/health-metric-card";
import { computeHealthSummaries } from "@/components/features/health/health-metrics";
import type { HealthMetric } from "@/lib/types";

interface HealthViewProps {
  metrics: HealthMetric[];
}

/** The Health screen — latest sleep, weight, steps and resting HR with trends. */
export function HealthView({ metrics }: HealthViewProps) {
  const summaries = computeHealthSummaries(metrics);
  const hasAny = summaries.some((s) => s.latest != null);

  return (
    <div className="flex flex-1 flex-col pt-safe">
      <header className="px-5 pt-2">
        <h1 className="text-[26px] font-bold tracking-[-0.5px] text-ink">Health</h1>
        <div className="mt-1 flex items-center gap-2">
          <HeartPulse className="size-3.5 text-ink-2" strokeWidth={1.75} />
          <p className="text-[13px] font-medium text-ink-2">Synced from Apple Health</p>
        </div>
      </header>

      <div className="flex flex-col gap-3.5 px-5 pb-[96px] pt-3.5">
        {!hasAny && (
          <div className="rounded-card border border-dashed border-hairline bg-surface px-5 py-6">
            <p className="text-[13px] font-semibold text-ink">No health data yet</p>
            <p className="mt-1.5 text-[12px] font-medium leading-relaxed text-ink-2">
              Compass receives Apple Health data from an iOS Shortcut. Once your
              &ldquo;Sync Health to Compass&rdquo; Shortcut runs, your latest sleep, weight,
              steps and resting heart rate show up here.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3.5">
          {summaries.map((s) => (
            <HealthMetricCard key={s.meta.kind} summary={s} />
          ))}
        </div>
      </div>
    </div>
  );
}
