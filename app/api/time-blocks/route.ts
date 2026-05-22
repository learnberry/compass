import type { NextRequest } from "next/server";

import { created, handle, ok } from "@/lib/api/respond";
import { parseJson, timeBlockInputSchema } from "@/lib/api/validators";
import { getRepository } from "@/lib/db/repository";
import { todayStr } from "@/lib/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: NextRequest): Promise<Response> {
  return handle(async () => {
    const date = request.nextUrl.searchParams.get("date") ?? todayStr();
    const blocks = await getRepository().listTimeBlocks(date);
    return ok(blocks);
  });
}

export function POST(request: NextRequest): Promise<Response> {
  return handle(async () => {
    const input = await parseJson(request, timeBlockInputSchema);
    const block = await getRepository().createTimeBlock(input);
    return created(block);
  });
}
