import type { NextRequest } from "next/server";

import { handle, noContent, notFound, ok } from "@/lib/api/respond";
import { domainPatchSchema, parseJson } from "@/lib/api/validators";
import { getRepository } from "@/lib/db/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export function PATCH(request: NextRequest, { params }: Params): Promise<Response> {
  return handle(async () => {
    const { id } = await params;
    const patch = await parseJson(request, domainPatchSchema);
    const domain = await getRepository().updateDomain(id, patch);
    if (!domain) return notFound("Domain not found");
    return ok(domain);
  });
}

export function DELETE(_request: NextRequest, { params }: Params): Promise<Response> {
  return handle(async () => {
    const { id } = await params;
    const repo = getRepository();
    const existing = await repo.getDomain(id);
    if (!existing) return notFound("Domain not found");
    await repo.deleteDomain(id);
    return noContent();
  });
}
