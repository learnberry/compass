import type { ReactNode } from "react";

import { COLORS } from "@/lib/design";
import { cn } from "@/lib/utils";

/** Small bordered metric card — label (11/600) over a big value (22/700). */
export function MetricTile({
  label,
  value,
  suffix,
  accent = COLORS.ink,
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  suffix?: string;
  accent?: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[14px] border border-hairline bg-surface px-3 pb-[11px] pt-3",
        className,
      )}
    >
      <div className="text-[11px] font-semibold tracking-[0.2px] text-ink-2">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-[3px]">
        {icon && <span className="mr-0.5 self-center">{icon}</span>}
        <span
          className="text-[22px] font-bold leading-none tracking-[-0.5px] tnum"
          style={{ color: accent }}
        >
          {value}
        </span>
        {suffix && <span className="text-xs font-semibold text-ink-2">{suffix}</span>}
      </div>
    </div>
  );
}
