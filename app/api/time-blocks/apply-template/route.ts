import type { NextRequest } from "next/server";

import { created, handle, notFound } from "@/lib/api/respond";
import { applyTemplateBodySchema, parseJson } from "@/lib/api/validators";
import { getRepository } from "@/lib/db/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: NextRequest): Promise<Response> {
  return handle(async () => {
    const { templateId, date } = await parseJson(request, applyTemplateBodySchema);
    const repo = getRepository();
    const template = await repo.getTemplate(templateId);
    if (!template) return notFound("Template not found");
    const blocks = await repo.applyTemplate(templateId, date);
    return created(blocks);
  });
}
