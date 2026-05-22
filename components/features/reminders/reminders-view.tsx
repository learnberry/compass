"use client";

import { useMemo, useState } from "react";
import { Bell } from "lucide-react";

import { SectionHeader } from "@/components/compass/section-header";
import type { Domain, Habit, Reminder } from "@/lib/types";
import { isoNow, todayStr } from "@/lib/dates";
import { ReminderBanner } from "./reminder-banner";
import { PushPreview } from "./push-preview";
import { UpcomingList } from "./upcoming-list";

interface RemindersViewProps {
  /** Every reminder (used to compute "today" + "upcoming"). */
  reminders: Reminder[];
  /** Reminders currently due — not acknowledged, not snoozed. */
  due: Reminder[];
  habits: Habit[];
  domains: Domain[];
}

/** Whether a reminder's scheduledTime falls on today's local calendar date. */
function isToday(reminder: Reminder): boolean {
  const d = new Date(reminder.scheduledTime);
  const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
  return local === todayStr();
}

/**
 * The Reminders screen — header with a bell + unread badge, then the three
 * reminder surfaces: in-app banner, lock-screen push preview, and the
 * upcoming-today list.
 */
export function RemindersView({
  reminders,
  due,
  habits,
  domains,
}: RemindersViewProps) {
  // Reminders the user has completed in this session — dropped from the badge.
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());

  const habitsById = useMemo(() => {
    const m = new Map<string, Habit>();
    for (const h of habits) m.set(h.id, h);
    return m;
  }, [habits]);

  const domainsById = useMemo(() => {
    const m = new Map<string, Domain>();
    for (const d of domains) m.set(d.id, d);
    return m;
  }, [domains]);

  // Due reminders still outstanding, earliest first — the banner picks the top.
  const activeDue = useMemo(
    () =>
      due
        .filter((r) => !acknowledged.has(r.id))
        .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime)),
    [due, acknowledged],
  );
  const bannerReminder = activeDue[0];

  // Today's reminders that haven't fired yet — the lock-screen preview + list.
  const now = isoNow();
  const upcoming = useMemo(
    () =>
      reminders
        .filter(
          (r) =>
            isToday(r) &&
            r.acknowledgedAt === null &&
            r.scheduledTime > now,
        )
        .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime)),
    [reminders, now],
  );
  const nextReminder = upcoming[0];

  // Count of reminders scheduled for today (drives the header subtitle).
  const todayCount = useMemo(
    () => reminders.filter(isToday).length,
    [reminders],
  );

  return (
    <div className="flex flex-1 flex-col pt-safe">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-2">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.5px] text-ink">
            Reminders
          </h1>
          <p className="mt-0.5 text-xs text-ink-2 tnum">{todayCount} today</p>
        </div>

        <div className="relative">
          <button
            type="button"
            aria-label={
              activeDue.length > 0
                ? `Notifications, ${activeDue.length} due`
                : "Notifications"
            }
            className="flex size-11 items-center justify-center rounded-full border border-hairline bg-surface text-ink transition-transform active:scale-95"
          >
            <Bell className="size-5" strokeWidth={1.75} />
          </button>
          {activeDue.length > 0 ? (
            <span
              className="absolute flex h-[18px] min-w-[18px] items-center justify-center rounded-[9px] px-[5px] text-[10px] font-bold leading-none text-white tnum"
              style={{
                top: -2,
                right: -2,
                background: "#EA4335",
                border: "2px solid #FFFFFF",
              }}
            >
              {activeDue.length > 99 ? "99+" : activeDue.length}
            </span>
          ) : null}
        </div>
      </header>

      {/* Sections */}
      <div className="px-5 pb-[96px] pt-4">
        {/* In-app banner */}
        <SectionHeader title="In-app banner" />
        {bannerReminder ? (
          <ReminderBanner
            key={bannerReminder.id}
            reminder={bannerReminder}
            habitsById={habitsById}
            domainsById={domainsById}
            onComplete={(id) =>
              setAcknowledged((prev) => new Set(prev).add(id))
            }
          />
        ) : (
          <div className="mb-4 rounded-card border border-hairline bg-surface px-4 py-5 text-center">
            <p className="text-[13px] font-medium text-ink-2">
              No reminders due right now.
            </p>
          </div>
        )}

        {/* Lock-screen push */}
        <SectionHeader title="Lock-screen push" />
        {nextReminder ? (
          <PushPreview reminder={nextReminder} />
        ) : (
          <div className="mb-4 rounded-card border border-hairline bg-surface px-4 py-5 text-center">
            <p className="text-[13px] font-medium text-ink-2">
              No upcoming reminders to preview.
            </p>
          </div>
        )}

        {/* Upcoming today */}
        <SectionHeader title="Upcoming today" />
        <UpcomingList
          reminders={upcoming}
          habitsById={habitsById}
          domainsById={domainsById}
        />
      </div>
    </div>
  );
}
