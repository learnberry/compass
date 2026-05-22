"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { BlockDialog } from "@/components/features/schedule/block-dialog";
import { DayGrid } from "@/components/features/schedule/day-grid";
import { TemplatesView } from "@/components/features/schedule/templates-view";
import { WeekView } from "@/components/features/schedule/week-view";
import { Fab } from "@/components/compass/fab";
import { SegmentedControl } from "@/components/compass/segmented-control";
import type {
  AppSettings,
  BlockTemplate,
  Domain,
  Goal,
  Habit,
  TimeBlock,
} from "@/lib/types";
import { api } from "@/lib/api-client";
import { format, parseDate, shiftDate, todayStr } from "@/lib/dates";
import { cn } from "@/lib/utils";

type Tab = "today" | "week" | "templates";

const TABS: { value: Tab; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "templates", label: "Templates" },
];

interface ScheduleViewProps {
  initialDate: string;
  initialBlocks: TimeBlock[];
  domains: Domain[];
  habits: Habit[];
  goals: Goal[];
  initialTemplates: BlockTemplate[];
  settings: AppSettings;
}

/** The Schedule screen — hourly day grid, week overview and templates. */
export function ScheduleView({
  initialDate,
  initialBlocks,
  domains,
  habits,
  goals,
  initialTemplates,
  settings,
}: ScheduleViewProps) {
  const [tab, setTab] = useState<Tab>("today");
  const [date, setDate] = useState(initialDate);
  const [blocks, setBlocks] = useState<TimeBlock[]>(initialBlocks);
  const [templates, setTemplates] = useState<BlockTemplate[]>(initialTemplates);
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TimeBlock | undefined>(undefined);
  const [defaultStart, setDefaultStart] = useState<string | undefined>(
    undefined,
  );

  const today = todayStr();
  const isToday = date === today;
  const mounted = useRef(false);

  const load = useCallback(async (d: string) => {
    setLoading(true);
    try {
      setBlocks(await api.timeBlocks.list(d));
    } catch {
      toast.error("Couldn't load schedule");
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload blocks when the displayed date changes (skip the initial render).
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    load(date);
  }, [date, load]);

  function goPrev() {
    setDate((d) => shiftDate(d, -1));
  }
  function goNext() {
    setDate((d) => shiftDate(d, 1));
  }
  function goToday() {
    setDate(today);
  }

  function openCreate(startTime?: string) {
    setEditing(undefined);
    setDefaultStart(startTime);
    setDialogOpen(true);
  }

  function openEdit(block: TimeBlock) {
    setEditing(block);
    setDefaultStart(undefined);
    setDialogOpen(true);
  }

  function pickDay(d: string) {
    setDate(d);
    setTab("today");
  }

  return (
    <div className="flex min-h-dvh flex-col pt-safe">
      {/* Header */}
      <header className="px-5 pb-1 pt-2">
        <div className="flex items-baseline justify-between">
          <h1 className="text-[26px] font-bold tracking-[-0.5px] text-ink">
            Schedule
          </h1>
          <span className="text-[12px] font-medium text-ink-2">
            {format(parseDate(date), "EEE, MMM d")}
          </span>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-5 pb-3 pt-2.5">
        <SegmentedControl options={TABS} value={tab} onChange={setTab} />
      </div>

      {/* Date navigator */}
      <div className="flex items-center gap-2 px-5 pb-3">
        <button
          type="button"
          aria-label="Previous day"
          onClick={goPrev}
          className="flex size-9 items-center justify-center rounded-full border border-hairline bg-surface text-ink-2 transition-transform active:scale-95"
        >
          <ChevronLeft className="size-[18px]" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={goToday}
          className={cn(
            "flex h-9 flex-1 items-center justify-center rounded-full border text-[13px] font-semibold transition-colors",
            isToday
              ? "border-hairline bg-surface text-ink-3"
              : "border-transparent bg-career-tint text-career",
          )}
        >
          {isToday ? "Today" : "Jump to today"}
        </button>
        <button
          type="button"
          aria-label="Next day"
          onClick={goNext}
          className="flex size-9 items-center justify-center rounded-full border border-hairline bg-surface text-ink-2 transition-transform active:scale-95"
        >
          <ChevronRight className="size-[18px]" strokeWidth={1.75} />
        </button>
      </div>

      {/* Tab body */}
      {tab === "today" && (
        <>
          {loading ? (
            <div className="flex-1 space-y-2 px-5 pb-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-tile bg-divider"
                />
              ))}
            </div>
          ) : (
            <DayGrid
              startHour={settings.dayStartHour}
              endHour={settings.dayEndHour}
              blocks={blocks}
              isToday={isToday}
              onCreateAt={openCreate}
              onEditBlock={openEdit}
            />
          )}
        </>
      )}

      {tab === "week" && (
        <WeekView
          date={date}
          knownBlocks={{ [date]: blocks }}
          onPickDay={pickDay}
        />
      )}

      {tab === "templates" && (
        <TemplatesView
          templates={templates}
          date={date}
          onApplied={() => {
            load(date);
            setTab("today");
          }}
          onDeleted={(id) =>
            setTemplates((ts) => ts.filter((t) => t.id !== id))
          }
        />
      )}

      <Fab label="New block" onClick={() => openCreate()} />

      <BlockDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        date={date}
        block={editing}
        defaultStart={defaultStart}
        domains={domains}
        habits={habits}
        goals={goals}
        onSaved={() => load(date)}
      />
    </div>
  );
}
