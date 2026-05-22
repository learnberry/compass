import type { NextRequest } from "next/server";

import { handle, noContent, notFound, ok } from "@/lib/api/respond";
import { parseJson, reminderPatchSchema } from "@/lib/api/validators";
import { getRepository } from "@/lib/db/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export function PATCH(request: NextRequest, { params }: Params): Promise<Response> {
  return handle(async () => {
    const { id } = await params;
    const patch = await parseJson(request, reminderPatchSchema);
    const reminder = await getRepository().updateReminder(id, patch);
    if (!reminder) return notFound("Reminder not found");
    return ok(reminder);
  });
}

export function DELETE(_request: NextRequest, { params }: Params): Promise<Response> {
  return handle(async () => {
    const { id } = await params;
    const repo = getRepository();
    const existing = await repo.getReminder(id);
    if (!existing) return notFound("Reminder not found");
    await repo.deleteReminder(id);
    return noContent();
  });
}
