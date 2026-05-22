/**
 * The push payload contract.
 *
 * This is the exact JSON shape that the server sends via web-push and that the
 * service worker (public/sw.js, owned by the pwa-agent) consumes in its `push`
 * and `notificationclick` handlers. It must not drift from that contract.
 */

/** A notification action button surfaced by the OS. */
export interface PushAction {
  /** Action id echoed back to the service worker's `notificationclick`. */
  action: string;
  /** Button label shown to the user. */
  title: string;
}

/** The JSON payload delivered to the service worker by every push. */
export interface PushPayload {
  title: string;
  body: string;
  /** Notification tag — pushes with the same tag collapse into one. */
  tag: string;
  /** App URL to open when the notification is clicked. */
  url: string;
  /** The reminder this push relates to, or null for non-reminder pushes. */
  reminderId: string | null;
  /** OS action buttons (e.g. complete / snooze for reminders). */
  actions: PushAction[];
}
