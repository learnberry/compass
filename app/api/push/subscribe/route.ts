/**
 * POST /api/push/subscribe — register (or refresh) a web-push subscription.
 *
 * Body: { subscription: PushSubscriptionJSON, userAgent: string }
 * The browser obtains `subscription` from `PushSubscription.toJSON()`.
 */

import type { NextRequest } from "next/server";

import { badRequest, handle, ok } from "@/lib/api/respond";
import { getRepository } from "@/lib/db/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SubscribeBody {
  subscription?: PushSubscriptionJSON;
  userAgent?: string;
}

export function POST(request: NextRequest): Promise<Response> {
  return handle(async () => {
    const body = (await request.json()) as SubscribeBody;
    const sub = body.subscription;
    const endpoint = sub?.endpoint;
    const p256dh = sub?.keys?.p256dh;
    const auth = sub?.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      return badRequest("Invalid push subscription: endpoint and keys are required");
    }

    await getRepository().upsertPushSubscription({
      endpoint,
      p256dh,
      auth,
      userAgent: typeof body.userAgent === "string" ? body.userAgent : null,
    });

    return ok({ ok: true });
  });
}
