import type { NextRequest } from "next/server";

import { created, handle, ok } from "@/lib/api/respond";
import { habitInputSchema, parseJson } from "@/lib/api/validators";
import { getRepository } from "@/lib/db/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: NextRequest): Promise<Response> {
  return handle(async () => {
    const includeArchived = request.nextUrl.searchParams.get("includeArchived") === "true";
    const habits = await getRepository().listHabits({ includeArchived });
    return ok(habits);
  });
}

export function POST(request: NextRequest): Promise<Response> {
  return handle(async () => {
    const input = await parseJson(request, habitInputSchema);
    const habit = await getRepository().createHabit(input);
    return created(habit);
  });
}
