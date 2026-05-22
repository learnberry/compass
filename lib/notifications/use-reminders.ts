"use client";

/**
 * `useReminders` — the in-app reminder feed.
 *
 * While the app is open and visible this hook:
 *   - polls `api.reminders.due()` every 60s (and on tab focus),
 *   - periodically calls `api.dispatch()` so due reminders also fire as push
 *     even when no external scheduler is running,
 *   - raises a haptic + toast the first time a given reminder appears.
 *
 * It exposes the due list plus acknowledge / snooze actions for the in-app
 * notification UI (banner + bell).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { api } from "@/lib/api-client";
import { haptic } from "@/lib/utils";
import type { Reminder } from "@/lib/types";

/** How often to refetch the due list while visible (ms). */
const POLL_INTERVAL_MS = 60_000;
/** How often to kick the server-side dispatcher while visible (ms). */
const DISPATCH_INTERVAL_MS = 60_000;

export interface UseRemindersResult {
  /** Reminders currently due (not acknowledged, not snoozed). */
  due: Reminder[];
  /** Count of due reminders — drives the notification bell badge. */
  unreadCount: number;
  /** Whether the first load is still in flight. */
  isLoading: boolean;
  /** Acknowledge / complete a reminder. */
  acknowledge: (id: string) => Promise<void>;
  /** Snooze a reminder by `minutes` (use -1 for "tomorrow"). */
  snooze: (id: string, minutes: number) => Promise<void>;
  /** Force an immediate refetch of the due list. */
  refresh: () => Promise<void>;
}

export function useReminders(): UseRemindersResult {
  const [due, setDue] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Ids we have already toasted, so re-polls don't re-notify.
  const seenIds = useRef<Set<string>>(new Set());
  // Guards the very first fetch from toasting the whole backlog.
  const primed = useRef(false);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const reminders = await api.reminders.due();
      setDue(reminders);

      if (!primed.current) {
        // First load: remember everything without notifying.
        for (const reminder of reminders) seenIds.current.add(reminder.id);
        primed.current = true;
      } else {
        const fresh = reminders.filter((r) => !seenIds.current.has(r.id));
        for (const reminder of fresh) seenIds.current.add(reminder.id);
        if (fresh.length > 0) {
          haptic();
          for (const reminder of fresh) {
            toast(reminder.title, {
              description: reminder.body || undefined,
            });
          }
        }
      }

      // Drop ids that are no longer due so the set cannot grow unbounded.
      const live = new Set(reminders.map((r) => r.id));
      for (const id of seenIds.current) {
        if (!live.has(id)) seenIds.current.delete(id);
      }
    } catch (error) {
      console.error("[use-reminders] failed to load due reminders:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const acknowledge = useCallback(
    async (id: string): Promise<void> => {
      // Optimistically drop it so the UI responds immediately.
      setDue((prev) => prev.filter((r) => r.id !== id));
      seenIds.current.delete(id);
      try {
        await api.reminders.ack(id);
      } catch (error) {
        console.error("[use-reminders] failed to acknowledge reminder:", error);
        toast.error("Couldn't complete reminder");
      }
      await refresh();
    },
    [refresh],
  );

  const snooze = useCallback(
    async (id: string, minutes: number): Promise<void> => {
      setDue((prev) => prev.filter((r) => r.id !== id));
      seenIds.current.delete(id);
      try {
        await api.reminders.snooze(id, minutes);
      } catch (error) {
        console.error("[use-reminders] failed to snooze reminder:", error);
        toast.error("Couldn't snooze reminder");
      }
      await refresh();
    },
    [refresh],
  );

  // Poll the due list + kick the dispatcher while the tab is visible.
  useEffect(() => {
    if (typeof document === "undefined") return;

    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let dispatchTimer: ReturnType<typeof setInterval> | null = null;

    const kickDispatch = (): void => {
      // Best-effort: a failed dispatch must not surface to the user.
      void api.dispatch().catch(() => {
        /* dispatcher unavailable — the next poll still surfaces reminders */
      });
    };

    const start = (): void => {
      if (pollTimer === null) {
        pollTimer = setInterval(() => void refresh(), POLL_INTERVAL_MS);
      }
      if (dispatchTimer === null) {
        dispatchTimer = setInterval(kickDispatch, DISPATCH_INTERVAL_MS);
      }
    };

    const stop = (): void => {
      if (pollTimer !== null) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      if (dispatchTimer !== null) {
        clearInterval(dispatchTimer);
        dispatchTimer = null;
      }
    };

    const onVisibilityChange = (): void => {
      if (document.visibilityState === "visible") {
        kickDispatch();
        void refresh();
        start();
      } else {
        stop();
      }
    };

    // Prime immediately and start the timers if we're visible.
    if (document.visibilityState === "visible") {
      kickDispatch();
      void refresh();
      start();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refresh]);

  return {
    due,
    unreadCount: due.length,
    isLoading,
    acknowledge,
    snooze,
    refresh,
  };
}
