import { ProgressTrack } from "@/components/compass/progress-track";
import { COLORS, domainVisual } from "@/lib/design";
import type { Domain } from "@/lib/types";
import { cn } from "@/lib/utils";

/** A goal row: domain dot, title, %, progress bar and a due-date pill. */
export function GoalRow({
  title,
  progress,
  due,
  domain,
  last,
}: {
  title: string;
  /** 0–100. */
  progress: number;
  /** Pre-formatted due-date label, e.g. "Sep 30". */
  due: string | null;
  domain: Domain | undefined;
  last: boolean;
}) {
  const color = domain ? domainVisual(domain).solid : COLORS.ink3;
  return (
    <div className={cn(last ? "mb-2.5" : "mb-3.5")}>
      <div className="mb-1.5 flex items-center gap-2">
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ background: color }}
        />
        <div className="min-w-0 flex-1 truncate text-[13px] font-semibold tracking-[-0.1px] text-ink">
          {title}
        </div>
        <div className="text-[11px] font-semibold text-ink-2 tnum">
          {progress}%
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <ProgressTrack value={progress} color={color} className="flex-1" />
        {due && (
          <span className="rounded-full bg-divider px-[7px] py-0.5 text-[10px] font-semibold text-ink-2">
            {due}
          </span>
        )}
      </div>
    </div>
  );
}
