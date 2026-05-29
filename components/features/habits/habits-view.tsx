"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ListFilter, Plus } from "lucide-react";

import { CircleButton } from "@/components/compass/circle-button";
import { HabitCard } from "@/components/features/habits/habit-card";
import { HabitDialog } from "@/components/features/habits/habit-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Domain, HabitWithStatus } from "@/lib/types";
import { api } from "@/lib/api-client";
import { todayStr } from "@/lib/dates";
import { cn, haptic } from "@/lib/utils";

interface HabitsViewProps {
  initialHabits: HabitWithStatus[];
  domains: Domain[];
}

/** The Habits list screen — header with actions, then a stack of habit cards. */
export function HabitsView({ initialHabits, domains }: HabitsViewProps) {
  const router = useRouter();
  const [habits, setHabits] = useState(initialHabits);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterDomainId, setFilterDomainId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const domainsById = useMemo(() => {
    const m = new Map<string, Domain>();
    for (const d of domains) m.set(d.id, d);
    return m;
  }, [domains]);

  const completedToday = useMemo(
    () => habits.filter((h) => h.doneToday).length,
    [habits],
  );

  const visibleHabits = useMemo(
    () =>
      filterDomainId
        ? habits.filter((h) => h.domainId === filterDomainId)
        : habits,
    [habits, filterDomainId],
  );

  const refresh = useCallback(async () => {
    try {
      setHabits(await api.habits.status(todayStr()));
    } catch {
      /* keep current state */
    }
    router.refresh();
  }, [router]);

  return (
    <div className="flex flex-1 flex-col pt-safe">
      {/* Header */}
      <header className="flex items-start justify-between px-5 pt-2">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.5px] text-ink">
            Habits
          </h1>
          <p className="mt-0.5 text-xs font-medium text-ink-2 tnum">
            {habits.length} active · {completedToday} completed today
          </p>
        </div>
        <div className="flex gap-2 pt-1">
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <CircleButton aria-label="Filter habits" className="relative">
                <ListFilter className="size-[18px]" strokeWidth={1.75} />
                {filterDomainId && (
                  <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-surface bg-career" />
                )}
              </CircleButton>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={6} className="w-52 p-1.5">
              <FilterItem
                label="All habits"
                active={filterDomainId === null}
                onClick={() => {
                  setFilterDomainId(null);
                  setFilterOpen(false);
                }}
              />
              {domains.map((d) => (
                <FilterItem
                  key={d.id}
                  label={d.name}
                  active={filterDomainId === d.id}
                  onClick={() => {
                    setFilterDomainId(d.id);
                    setFilterOpen(false);
                  }}
                />
              ))}
            </PopoverContent>
          </Popover>
          <CircleButton
            aria-label="New habit"
            onClick={() => {
              haptic(10);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-[18px]" strokeWidth={1.75} />
          </CircleButton>
        </div>
      </header>

      {/* Habit list */}
      <div className="flex flex-col gap-2.5 px-5 pb-[96px] pt-4">
        {habits.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-card border border-dashed border-hairline bg-surface px-6 py-14 text-center">
            <p className="text-[13px] font-medium text-ink-2">
              No habits yet. Start building a routine.
            </p>
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="rounded-btn bg-career px-4 py-2 text-[13px] font-semibold text-white transition-transform active:scale-95"
            >
              Create your first habit
            </button>
          </div>
        ) : visibleHabits.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-card border border-dashed border-hairline bg-surface px-6 py-14 text-center">
            <p className="text-[13px] font-medium text-ink-2">
              No habits in this domain.
            </p>
            <button
              type="button"
              onClick={() => setFilterDomainId(null)}
              className="rounded-btn bg-career px-4 py-2 text-[13px] font-semibold text-white transition-transform active:scale-95"
            >
              Clear filter
            </button>
          </div>
        ) : (
          visibleHabits.map((h) => (
            <HabitCard
              key={h.id}
              habit={h}
              domain={h.domainId ? domainsById.get(h.domainId) : undefined}
            />
          ))
        )}
      </div>

      <HabitDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        domains={domains}
        onSaved={refresh}
      />
    </div>
  );
}

/** A single row in the domain filter popover. */
function FilterItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-[14px] transition-colors hover:bg-muted",
        active ? "font-semibold text-ink" : "font-medium text-ink-2",
      )}
    >
      {label}
      {active && <Check className="size-4 text-career" strokeWidth={2} />}
    </button>
  );
}
