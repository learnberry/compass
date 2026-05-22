"use client";

import { Check, Flame } from "lucide-react";

import { DomainTile } from "@/components/compass/domain-tile";
import { domainVisual } from "@/lib/design";
import type { Domain, HabitWithStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * A single habit row inside the "Today's habits" card: domain icon tile,
 * name + sub-line, and a 30px completion toggle.
 */
export function HabitRow({
  habit,
  domain,
  last,
  onToggle,
}: {
  habit: HabitWithStatus;
  domain: Domain | undefined;
  last: boolean;
  onToggle: () => void;
}) {
  const visual = domainVisual(domain);
  const Icon = visual.icon;
  const done = habit.doneToday;

  const target =
    habit.targetValue > 0 && habit.unit
      ? `${habit.targetValue} ${habit.unit}`
      : habit.unit || "Daily";
  const streak = habit.stats.currentStreak;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3.5 py-3",
        !last && "border-b border-divider",
      )}
    >
      <DomainTile icon={Icon} solid={visual.solid} tint={visual.tint} />

      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "text-sm font-semibold tracking-[-0.1px]",
            done ? "text-ink-3 line-through" : "text-ink",
          )}
        >
          {habit.name}
        </div>
        <div className="mt-px flex items-center gap-1.5 text-[11px] text-ink-2">
          <span>{target}</span>
          <span className="size-0.5 rounded-full bg-ink-4" />
          <Flame className="size-2.5" strokeWidth={2} />
          <span className="tnum">{streak}d</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-pressed={done}
        aria-label={done ? `Mark ${habit.name} incomplete` : `Mark ${habit.name} complete`}
        className="relative flex size-11 shrink-0 items-center justify-center"
      >
        <span
          className={cn(
            "flex size-[30px] items-center justify-center rounded-full transition-colors",
            done ? "bg-creative" : "border-2 border-ink-4",
          )}
        >
          {done && <Check className="size-4 text-white" strokeWidth={3} />}
        </span>
      </button>
    </div>
  );
}
