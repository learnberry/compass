/**
 * POST /api/push/test — send a diagnostic push to every subscription.
 *
 * Used by the notification settings panel so the user can confirm push
 * delivery actually works on their device.
 */

import { badRequest, handle, ok } from "@/lib/api/respond";
import type { PushPayload } from "@/lib/notifications/types";
import { isPushConfigured, sendPushToAll } from "@/lib/notifications/web-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(): Promise<Response> {
  return handle(async () => {
    if (!isPushConfigured()) {
      return badRequest("VAPID keys not configured");
    }

    const payload: PushPayload = {
      title: "Compass test push",
      body: "Push notifications are working 🎉",
      tag: "compass-test",
      url: "/",
      reminderId: null,
      actions: [],
    };

    const sent = await sendPushToAll(payload);
    return ok({ sent });
  });
}
