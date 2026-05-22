"use client";

/**
 * `<NotificationBell />` — the app-header notification button.
 *
 * A bell icon with an unread-count badge. Tapping it opens a sheet listing the
 * due reminders plus recently acknowledged ones, each with ack / snooze
 * controls. Designed for the app header.
 */

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, Check, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { api } from "@/lib/api-client";
import { SNOOZE_OPTIONS } from "@/lib/constants";
import { format, parseISO } from "@/lib/dates";
import { useReminders } from "@/lib/notifications/use-reminders";
import type { Reminder } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Friendly time-of-day label for an ISO timestamp. */
function timeLabel(iso: string): string {
  try {
    return format(parseISO(iso), "EEE d MMM, HH:mm");
  } catch {
    return iso;
  }
}

interface ReminderRowProps {
  reminder: Reminder;
  /** When true the row offers ack / snooze actions. */
  actionable: boolean;
  onAcknowledge: (id: string) => void;
  onSnooze: (id: string, minutes: number) => void;
}

function ReminderRow({
  reminder,
  actionable,
  onAcknowledge,
  onSnooze,
}: ReminderRowProps): React.JSX.Element {
  const [showSnooze, setShowSnooze] = useState(false);
  const acknowledged = reminder.acknowledgedAt !== null;

  return (
    <li className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
            acknowledged
              ? "bg-muted text-muted-foreground"
              : "bg-primary/15 text-primary",
          )}
        >
          {acknowledged ? <Check className="size-4" /> : <Bell className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate font-medium leading-tight",
              acknowledged && "text-muted-foreground line-through",
            )}
          >
            {reminder.title}
          </p>
          {reminder.body ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{reminder.body}</p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">
            {timeLabel(reminder.scheduledTime)}
          </p>
        </div>
      </div>

      {actionable ? (
        showSnooze ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {SNOOZE_OPTIONS.map((option) => (
              <Button
                key={option.minutes}
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowSnooze(false);
                  onSnooze(reminder.id, option.minutes);
                }}
              >
                {option.label}
              </Button>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setShowSnooze(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              onClick={() => onAcknowledge(reminder.id)}
            >
              <Check className="size-4" />
              Done
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => setShowSnooze(true)}
            >
              <Clock className="size-4" />
              Snooze
            </Button>
          </div>
        )
      ) : null}
    </li>
  );
}

export function NotificationBell(): React.JSX.Element {
  const { due, unreadCount, acknowledge, snooze } = useReminders();
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<Reminder[]>([]);

  const dueIds = new Set(due.map((r) => r.id));

  const loadRecent = useCallback(async (): Promise<void> => {
    try {
      const all = await api.reminders.list();
      const acknowledged = all
        .filter((r) => r.acknowledgedAt !== null)
        .sort((a, b) => (b.acknowledgedAt ?? "").localeCompare(a.acknowledgedAt ?? ""))
        .slice(0, 10);
      setRecent(acknowledged);
    } catch (error) {
      console.error("[notification-bell] failed to load recent reminders:", error);
    }
  }, []);

  // Refresh the "recent" list whenever the sheet is opened.
  useEffect(() => {
    if (open) void loadRecent();
  }, [open, loadRecent]);

  const handleAcknowledge = (id: string): void => {
    void acknowledge(id).then(loadRecent);
  };

  const handleSnooze = (id: string, minutes: number): void => {
    void snooze(id, minutes);
  };

  const recentNotDue = recent.filter((r) => !dueIds.has(r.id));

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={
          unreadCount > 0 ? `Notifications, ${unreadCount} due` : "Notifications"
        }
        className="relative flex size-11 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent"
      >
        <Bell className="size-5" />
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-semibold leading-none text-destructive-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      <SheetContent side="right" className="flex w-full max-w-sm flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border p-5">
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>
            {unreadCount > 0
              ? `${unreadCount} reminder${unreadCount === 1 ? "" : "s"} need${
                  unreadCount === 1 ? "s" : ""
                } attention`
              : "You're all caught up"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-5">
          {due.length === 0 && recentNotDue.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
              <BellOff className="size-8" />
              <p className="text-sm">No reminders yet.</p>
            </div>
          ) : null}

          {due.length > 0 ? (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Due now
              </h3>
              <ul className="flex flex-col gap-2">
                {due.map((reminder) => (
                  <ReminderRow
                    key={reminder.id}
                    reminder={reminder}
                    actionable
                    onAcknowledge={handleAcknowledge}
                    onSnooze={handleSnooze}
                  />
                ))}
              </ul>
            </section>
          ) : null}

          {recentNotDue.length > 0 ? (
            <section className={cn(due.length > 0 && "mt-6")}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Recent
              </h3>
              <ul className="flex flex-col gap-2">
                {recentNotDue.map((reminder) => (
                  <ReminderRow
                    key={reminder.id}
                    reminder={reminder}
                    actionable={false}
                    onAcknowledge={handleAcknowledge}
                    onSnooze={handleSnooze}
                  />
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
