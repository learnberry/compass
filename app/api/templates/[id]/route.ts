import type { NextRequest } from "next/server";

import { handle, noContent, notFound, ok } from "@/lib/api/respond";
import { blockTemplatePatchSchema, parseJson } from "@/lib/api/validators";
import { getRepository } from "@/lib/db/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export function GET(_request: NextRequest, { params }: Params): Promise<Response> {
  return handle(async () => {
    const { id } = await params;
    const template = await getRepository().getTemplate(id);
    if (!template) return notFound("Template not found");
    return ok(template);
  });
}

export function PATCH(request: NextRequest, { params }: Params): Promise<Response> {
  return handle(async () => {
    const { id } = await params;
    const patch = await parseJson(request, blockTemplatePatchSchema);
    const template = await getRepository().updateTemplate(id, patch);
    if (!template) return notFound("Template not found");
    return ok(template);
  });
}

export function DELETE(_request: NextRequest, { params }: Params): Promise<Response> {
  return handle(async () => {
    const { id } = await params;
    const repo = getRepository();
    const existing = await repo.getTemplate(id);
    if (!existing) return notFound("Template not found");
    await repo.deleteTemplate(id);
    return noContent();
  });
}
