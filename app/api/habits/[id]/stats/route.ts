import type { NextRequest } from "next/server";

import { handle, notFound, ok } from "@/lib/api/respond";
import { getRepository } from "@/lib/db/repository";
import { todayStr } from "@/lib/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export function GET(request: NextRequest, { params }: Params): Promise<Response> {
  return handle(async () => {
    const { id } = await params;
    const repo = getRepository();
    const habit = await repo.getHabit(id);
    if (!habit) return notFound("Habit not found");
    const date = request.nextUrl.searchParams.get("date") ?? todayStr();
    const stats = await repo.getHabitStats(id, date);
    return ok(stats);
  });
}
