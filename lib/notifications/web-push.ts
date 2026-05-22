/**
 * Server-side web-push delivery.
 *
 * web-push is configured from the VAPID environment variables. When any key is
 * missing (common in dev) the module degrades gracefully: `isPushConfigured()`
 * returns false and the send helpers no-op instead of throwing.
 */

import * as webpush from "web-push";
import type { PushSubscription, WebPushError } from "web-push";

import { getRepository } from "@/lib/db/repository";
import type { PushSubscriptionRecord } from "@/lib/types";

import type { PushPayload } from "./types";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:notifications@compass.app";

const configured = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (configured) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY as string, VAPID_PRIVATE_KEY as string);
} else {
  console.warn(
    "[web-push] VAPID keys not configured — push notifications are disabled. " +
      "Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to enable them.",
  );
}

/** Whether web-push has valid VAPID credentials and can send pushes. */
export function isPushConfigured(): boolean {
  return configured;
}

/** Map a stored subscription record to the shape the web-push library expects. */
function toPushSubscription(sub: PushSubscriptionRecord): PushSubscription {
  return {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
  };
}

/** A web-push error carries a numeric `statusCode` from the push service. */
function statusCodeOf(error: unknown): number | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof (error as WebPushError).statusCode === "number"
  ) {
    return (error as WebPushError).statusCode;
  }
  return null;
}

/**
 * Send a single push to one subscription.
 *
 * Returns true on success. On a 404/410 (subscription gone) the subscription is
 * deleted from the repository and false is returned. Other failures are logged
 * and return false — a single bad endpoint must never abort a fan-out.
 */
export async function sendPushToSubscription(
  sub: PushSubscriptionRecord,
  payload: PushPayload,
): Promise<boolean> {
  if (!configured) return false;
  try {
    await webpush.sendNotification(toPushSubscription(sub), JSON.stringify(payload));
    return true;
  } catch (error) {
    const status = statusCodeOf(error);
    if (status === 404 || status === 410) {
      // Subscription is permanently gone — prune it.
      try {
        await getRepository().deletePushSubscription(sub.endpoint);
      } catch (cleanupError) {
        console.error("[web-push] failed to delete stale subscription:", cleanupError);
      }
      return false;
    }
    console.error("[web-push] failed to send push:", error);
    return false;
  }
}

/**
 * Fan a push out to every stored subscription.
 *
 * Stale subscriptions are pruned as a side effect. Returns the number of pushes
 * that were delivered successfully.
 */
export async function sendPushToAll(payload: PushPayload): Promise<number> {
  if (!configured) return 0;
  const subscriptions = await getRepository().listPushSubscriptions();
  const results = await Promise.all(
    subscriptions.map((sub) => sendPushToSubscription(sub, payload)),
  );
  return results.filter(Boolean).length;
}
