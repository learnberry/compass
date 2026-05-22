import type { NextRequest } from "next/server";

import { handle, ok } from "@/lib/api/respond";
import { getRepository } from "@/lib/db/repository";
import { todayStr } from "@/lib/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: NextRequest): Promise<Response> {
  return handle(async () => {
    const date = request.nextUrl.searchParams.get("date") ?? todayStr();
    const habits = await getRepository().getHabitsWithStatus(date);
    return ok(habits);
  });
}
