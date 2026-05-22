import type { NextRequest } from "next/server";

import { handle, noContent, notFound, ok } from "@/lib/api/respond";
import { goalPatchSchema, parseJson } from "@/lib/api/validators";
import { getRepository } from "@/lib/db/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export function GET(_request: NextRequest, { params }: Params): Promise<Response> {
  return handle(async () => {
    const { id } = await params;
    const goal = await getRepository().getGoal(id);
    if (!goal) return notFound("Goal not found");
    return ok(goal);
  });
}

export function PATCH(request: NextRequest, { params }: Params): Promise<Response> {
  return handle(async () => {
    const { id } = await params;
    const patch = await parseJson(request, goalPatchSchema);
    const goal = await getRepository().updateGoal(id, patch);
    if (!goal) return notFound("Goal not found");
    return ok(goal);
  });
}

export function DELETE(_request: NextRequest, { params }: Params): Promise<Response> {
  return handle(async () => {
    const { id } = await params;
    const repo = getRepository();
    const existing = await repo.getGoal(id);
    if (!existing) return notFound("Goal not found");
    await repo.deleteGoal(id);
    return noContent();
  });
}
