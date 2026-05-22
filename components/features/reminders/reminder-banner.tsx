"use client";

import { useState } from "react";
import { Clock } from "lucide-react";

import { DomainTile } from "@/components/compass/domain-tile";
import { api } from "@/lib/api-client";
import type { Domain, Habit, Reminder } from "@/lib/types";
import { haptic } from "@/lib/utils";
import { reminderVisual } from "./reminder-visual";

interface ReminderBannerProps {
  /** The most urgent due reminder to surface as an in-app banner. */
  reminder: Reminder;
  habitsById: Map<string, Habit>;
  domainsById: Map<string, Domain>;
  /** Called once the reminder is acknowledged so the parent can drop it. */
  onComplete: (id: string) => void;
}

/**
 * The in-app banner — a card with a 4px career-blue left border surfacing the
 * most urgent due reminder. "Complete" acknowledges it; "Snooze 15m" pushes it
 * 15 minutes out and swaps the card to a centred snoozed confirmation.
 */
export function ReminderBanner({
  reminder,
  habitsById,
  domainsById,
  onComplete,
}: ReminderBannerProps) {
  const [snoozed, setSnoozed] = useState(false);
  const [busy, setBusy] = useState(false);
  const { domain, icon } = reminderVisual(reminder, habitsById, domainsById);

  const handleComplete = async () => {
    if (busy) return;
    haptic(10);
    setBusy(true);
    try {
      await api.reminders.ack(reminder.id);
      onComplete(reminder.id);
    } catch {
      setBusy(false);
    }
  };

  const handleSnooze = async () => {
    if (busy) return;
    haptic(10);
    setBusy(true);
    setSnoozed(true);
    try {
      await api.reminders.snooze(reminder.id, 15);
    } catch {
      /* keep the snoozed visual — the next poll re-surfaces it if needed */
    }
  };

  if (snoozed) {
    return (
      <div className="mb-4 flex flex-col items-center gap-1.5 rounded-card border border-hairline bg-surface px-4 py-4 text-center">
        <Clock className="size-5 text-ink-2" strokeWidth={1.75} />
        <p className="text-[13px] font-medium text-ink-2">
          Snoozed for 15 minutes
        </p>
      </div>
    );
  }

  return (
    <div
      className="mb-4 flex items-start gap-3 rounded-card border border-hairline bg-surface p-3.5"
      style={{ borderLeft: `4px solid ${domain.solid}` }}
    >
      <DomainTile
        icon={icon}
        solid={domain.solid}
        tint={domain.tint}
        size={38}
        radius={11}
        iconSize={20}
      />

      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold tracking-[-0.1px] text-ink">
          {reminder.title}
        </p>
        {reminder.body ? (
          <p className="mt-0.5 text-xs text-ink-2">{reminder.body}</p>
        ) : null}

        <div className="mt-2.5 flex gap-2">
          <button
            type="button"
            onClick={handleComplete}
            disabled={busy}
            className="rounded-full bg-career px-3.5 py-[7px] text-xs font-semibold text-white transition-transform active:scale-95 disabled:opacity-60"
          >
            Complete
          </button>
          <button
            type="button"
            onClick={handleSnooze}
            disabled={busy}
            className="rounded-full border border-hairline bg-surface px-3.5 py-[7px] text-xs font-semibold text-ink transition-transform active:scale-95 disabled:opacity-60"
          >
            Snooze 15m
          </button>
        </div>
      </div>
    </div>
  );
}
