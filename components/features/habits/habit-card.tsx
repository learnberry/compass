import Link from "next/link";

import { DomainTile } from "@/components/compass/domain-tile";
import { StreakPill } from "@/components/compass/streak-pill";
import { domainVisual, iconByName } from "@/lib/design";
import type { Domain, HabitWithStatus } from "@/lib/types";
import { frequencyLabel } from "@/lib/hooks/habit-helpers";
import { lastNDays } from "@/lib/dates";

interface HabitCardProps {
  habit: HabitWithStatus;
  domain: Domain | undefined;
}

/**
 * A single habit row in the list — domain stripe, icon tile, name + meta,
 * a streak pill and the trailing 7-day completion dots. Whole card links to
 * the habit detail screen.
 */
export function HabitCard({ habit, domain }: HabitCardProps) {
  const visual = domainVisual(domain);
  const Icon = iconByName(habit.icon);

  // Last 7 days, oldest → newest: filled when that day was completed.
  const completedDates = new Set(
    habit.stats.history.filter((d) => d.completed).map((d) => d.date),
  );
  const dots = lastNDays(7).map((date) => completedDates.has(date));

  const target =
    habit.targetValue > 1 || habit.unit
      ? `${habit.targetValue}${habit.unit ? ` ${habit.unit}` : ""}`
      : frequencyLabel(habit.frequencyType, habit.frequencyConfig);

  return (
    <Link
      href={`/habits/${habit.id}`}
      className="relative block overflow-hidden rounded-card border border-hairline bg-surface transition-transform active:scale-[0.99]"
    >
      {/* Domain-color left stripe */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: visual.solid }}
      />

      <div className="flex items-center gap-3 py-3.5 pl-[18px] pr-3.5">
        <DomainTile
          icon={Icon}
          solid={visual.solid}
          tint={visual.tint}
          size={38}
          radius={11}
          iconSize={20}
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold tracking-[-0.2px] text-ink">
            {habit.name}
          </p>
          <p className="mt-0.5 truncate text-[11px] font-medium text-ink-2">
            {visual.name} · {target}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <StreakPill
            days={habit.stats.currentStreak}
            solid={visual.solid}
            tint={visual.tint}
          />
          <div className="flex gap-[3px]">
            {dots.map((filled, i) => (
              <span
                key={i}
                className="size-[7px] rounded-[4px]"
                style={{ background: filled ? visual.solid : "var(--color-divider)" }}
              />
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
