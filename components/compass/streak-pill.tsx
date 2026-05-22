import { Flame } from "lucide-react";

import { cn } from "@/lib/utils";

/** `🔥 47d` streak pill, tinted in a domain color. */
export function StreakPill({
  days,
  solid,
  tint,
  className,
}: {
  days: number;
  solid: string;
  tint: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-[3px] rounded-full px-2 py-[3px] text-[11px] font-bold tnum",
        className,
      )}
      style={{ background: tint, color: solid }}
    >
      <Flame className="size-[11px]" strokeWidth={2} />
      {days}d
    </span>
  );
}
