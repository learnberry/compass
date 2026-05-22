/**
 * POST /api/push/unsubscribe — remove a web-push subscription by endpoint.
 *
 * Body: { endpoint: string }
 */

import type { NextRequest } from "next/server";

import { badRequest, handle, ok } from "@/lib/api/respond";
import { getRepository } from "@/lib/db/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface UnsubscribeBody {
  endpoint?: string;
}

export function POST(request: NextRequest): Promise<Response> {
  return handle(async () => {
    const body = (await request.json()) as UnsubscribeBody;
    if (typeof body.endpoint !== "string" || body.endpoint.length === 0) {
      return badRequest("Invalid request: endpoint is required");
    }

    await getRepository().deletePushSubscription(body.endpoint);
    return ok({ ok: true });
  });
}
