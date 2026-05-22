import type { NextRequest } from "next/server";

import { handle, notFound, ok } from "@/lib/api/respond";
import { parseJson, snoozeBodySchema } from "@/lib/api/validators";
import { getRepository } from "@/lib/db/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Compute the ISO timestamp a reminder should re-surface at.
 *   - `minutes === -1`  -> tomorrow at 09:00 local time
 *   - otherwise         -> now + `minutes` minutes
 */
function computeSnoozedUntil(minutes: number): string {
  if (minutes === -1) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow.toISOString();
  }
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

export function POST(request: NextRequest, { params }: Params): Promise<Response> {
  return handle(async () => {
    const { id } = await params;
    const { minutes } = await parseJson(request, snoozeBodySchema);
    const reminder = await getRepository().updateReminder(id, {
      snoozedUntil: computeSnoozedUntil(minutes),
    });
    if (!reminder) return notFound("Reminder not found");
    return ok(reminder);
  });
}
