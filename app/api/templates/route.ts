import type { NextRequest } from "next/server";

import { created, handle, ok } from "@/lib/api/respond";
import { blockTemplateInputSchema, parseJson } from "@/lib/api/validators";
import { getRepository } from "@/lib/db/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): Promise<Response> {
  return handle(async () => {
    const templates = await getRepository().listTemplates();
    return ok(templates);
  });
}

export function POST(request: NextRequest): Promise<Response> {
  return handle(async () => {
    const input = await parseJson(request, blockTemplateInputSchema);
    const template = await getRepository().createTemplate(input);
    return created(template);
  });
}
