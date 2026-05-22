import type { NextRequest } from "next/server";

import { handle, noContent, notFound, ok } from "@/lib/api/respond";
import { habitPatchSchema, parseJson } from "@/lib/api/validators";
import { getRepository } from "@/lib/db/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export function GET(_request: NextRequest, { params }: Params): Promise<Response> {
  return handle(async () => {
    const { id } = await params;
    const habit = await getRepository().getHabit(id);
    if (!habit) return notFound("Habit not found");
    return ok(habit);
  });
}

export function PATCH(request: NextRequest, { params }: Params): Promise<Response> {
  return handle(async () => {
    const { id } = await params;
    const patch = await parseJson(request, habitPatchSchema);
    const habit = await getRepository().updateHabit(id, patch);
    if (!habit) return notFound("Habit not found");
    return ok(habit);
  });
}

export function DELETE(_request: NextRequest, { params }: Params): Promise<Response> {
  return handle(async () => {
    const { id } = await params;
    const repo = getRepository();
    const existing = await repo.getHabit(id);
    if (!existing) return notFound("Habit not found");
    await repo.deleteHabit(id);
    return noContent();
  });
}
