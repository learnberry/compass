import type { NextRequest } from "next/server";

import { handle, notFound, ok } from "@/lib/api/respond";
import { getRepository } from "@/lib/db/repository";
import { isoNow } from "@/lib/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export function POST(_request: NextRequest, { params }: Params): Promise<Response> {
  return handle(async () => {
    const { id } = await params;
    const reminder = await getRepository().updateReminder(id, {
      acknowledgedAt: isoNow(),
    });
    if (!reminder) return notFound("Reminder not found");
    return ok(reminder);
  });
}
