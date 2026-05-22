import type { NextRequest } from "next/server";

import { handle, ok } from "@/lib/api/respond";
import { parseJson, settingsPatchSchema } from "@/lib/api/validators";
import { getRepository } from "@/lib/db/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): Promise<Response> {
  return handle(async () => {
    const settings = await getRepository().getSettings();
    return ok(settings);
  });
}

export function PATCH(request: NextRequest): Promise<Response> {
  return handle(async () => {
    const patch = await parseJson(request, settingsPatchSchema);
    const settings = await getRepository().updateSettings(patch);
    return ok(settings);
  });
}
