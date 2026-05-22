/**
 * The reminder dispatcher.
 *
 * `dispatchDueReminders()` finds every reminder that is due right now, sends a
 * push for each one to all subscriptions, and stamps `sentAt` so it is not
 * dispatched again. It is called by the /api/dispatch route — both on a poll
 * from the open app and (in production) by an external scheduler/cron.
 */

import { isoNow } from "@/lib/dates";
import { getRepository } from "@/lib/db/repository";
import type { Reminder } from "@/lib/types";

import type { PushPayload } from "./types";
import { isPushConfigured, sendPushToAll } from "./web-push";

/** Build the push payload for a single reminder. */
function reminderPayload(reminder: Reminder): PushPayload {
  return {
    title: reminder.title,
    body: reminder.body,
    tag: `reminder-${reminder.id}`,
    url: "/",
    reminderId: reminder.id,
    actions: [
      { action: "complete", title: "Done" },
      { action: "snooze", title: "Snooze 10m" },
    ],
  };
}

/**
 * Dispatch every currently-due reminder.
 *
 * A reminder is "due" per the repository (`getDueReminders`): scheduled at or
 * before now, not acknowledged, not snoozed. We additionally skip reminders
 * that already carry a `sentAt` so a re-poll does not double-send — unless the
 * reminder has become due again (snooze elapsed) after the last send.
 *
 * Returns the number of reminders that were dispatched. Each dispatched
 * reminder gets its `sentAt` refreshed even when push is unconfigured, so the
 * in-app banner remains the source of truth and reminders are not re-fired.
 */
export async function dispatchDueReminders(): Promise<{ dispatched: number }> {
  const repo = getRepository();
  const now = isoNow();
  const due = await repo.getDueReminders(now);

  // Only act on reminders that have not been sent yet, or that became due
  // again after their last send (e.g. a snooze that has since elapsed).
  const pending = due.filter((reminder) => {
    if (reminder.sentAt === null) return true;
    if (reminder.snoozedUntil !== null && reminder.snoozedUntil > reminder.sentAt) {
      return true;
    }
    return false;
  });

  if (pending.length === 0) {
    return { dispatched: 0 };
  }

  const pushable = isPushConfigured();
  if (!pushable) {
    console.warn(
      "[dispatcher] push not configured — marking reminders sent for in-app delivery only.",
    );
  }

  let dispatched = 0;
  for (const reminder of pending) {
    if (pushable) {
      await sendPushToAll(reminderPayload(reminder));
    }
    await repo.updateReminder(reminder.id, { sentAt: isoNow() });
    dispatched += 1;
  }

  return { dispatched };
}
