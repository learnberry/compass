import type { NextRequest } from "next/server";

import { handle, noContent, notFound, ok } from "@/lib/api/respond";
import { parseJson, timeBlockPatchSchema } from "@/lib/api/validators";
import { getRepository } from "@/lib/db/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export function PATCH(request: NextRequest, { params }: Params): Promise<Response> {
  return handle(async () => {
    const { id } = await params;
    const patch = await parseJson(request, timeBlockPatchSchema);
    const block = await getRepository().updateTimeBlock(id, patch);
    if (!block) return notFound("Time block not found");
    return ok(block);
  });
}

export function DELETE(_request: NextRequest, { params }: Params): Promise<Response> {
  return handle(async () => {
    const { id } = await params;
    const repo = getRepository();
    const existing = await repo.getTimeBlock(id);
    if (!existing) return notFound("Time block not found");
    await repo.deleteTimeBlock(id);
    return noContent();
  });
}
