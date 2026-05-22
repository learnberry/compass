import type { NextRequest } from "next/server";

import { created, handle, ok } from "@/lib/api/respond";
import { goalInputSchema, parseJson } from "@/lib/api/validators";
import { getRepository, type GoalFilter } from "@/lib/db/repository";
import { GOAL_LEVELS, GOAL_STATUSES, type GoalLevel, type GoalStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: NextRequest): Promise<Response> {
  return handle(async () => {
    const params = request.nextUrl.searchParams;
    const filter: GoalFilter = {};

    const level = params.get("level");
    if (level && (GOAL_LEVELS as readonly string[]).includes(level)) {
      filter.level = level as GoalLevel;
    }

    const status = params.get("status");
    if (status && (GOAL_STATUSES as readonly string[]).includes(status)) {
      filter.status = status as GoalStatus;
    }

    const domainId = params.get("domainId");
    if (domainId) filter.domainId = domainId;

    if (params.has("parentId")) {
      const parentId = params.get("parentId");
      filter.parentId = parentId === "" ? null : parentId;
    }

    const goals = await getRepository().listGoals(filter);
    return ok(goals);
  });
}

export function POST(request: NextRequest): Promise<Response> {
  return handle(async () => {
    const input = await parseJson(request, goalInputSchema);
    const goal = await getRepository().createGoal(input);
    return created(goal);
  });
}
