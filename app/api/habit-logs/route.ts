import type { NextRequest } from "next/server";

import { created, handle, ok } from "@/lib/api/respond";
import { habitLogInputSchema, parseJson } from "@/lib/api/validators";
import { getRepository, type HabitLogFilter } from "@/lib/db/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: NextRequest): Promise<Response> {
  return handle(async () => {
    const params = request.nextUrl.searchParams;
    const filter: HabitLogFilter = {};

    const habitId = params.get("habitId");
    if (habitId) filter.habitId = habitId;

    const from = params.get("from");
    if (from) filter.from = from;

    const to = params.get("to");
    if (to) filter.to = to;

    const logs = await getRepository().listHabitLogs(filter);
    return ok(logs);
  });
}

export function POST(request: NextRequest): Promise<Response> {
  return handle(async () => {
    const input = await parseJson(request, habitLogInputSchema);
    const log = await getRepository().upsertHabitLog(input);
    return created(log);
  });
}
