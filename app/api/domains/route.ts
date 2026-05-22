import type { NextRequest } from "next/server";

import { created, handle, ok } from "@/lib/api/respond";
import { domainInputSchema, parseJson } from "@/lib/api/validators";
import { getRepository } from "@/lib/db/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): Promise<Response> {
  return handle(async () => {
    const domains = await getRepository().listDomains();
    return ok(domains);
  });
}

export function POST(request: NextRequest): Promise<Response> {
  return handle(async () => {
    const input = await parseJson(request, domainInputSchema);
    const domain = await getRepository().createDomain(input);
    return created(domain);
  });
}
