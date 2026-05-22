import type { NextRequest } from "next/server";

import { created, handle, ok } from "@/lib/api/respond";
import { parseJson, reminderInputSchema } from "@/lib/api/validators";
import { getRepository, type ReminderFilter } from "@/lib/db/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: NextRequest): Promise<Response> {
  return handle(async () => {
    const params = request.nextUrl.searchParams;
    const filter: ReminderFilter = {};

    const from = params.get("from");
    if (from) filter.from = from;

    const to = params.get("to");
    if (to) filter.to = to;

    if (params.get("unacknowledged") === "true") filter.unacknowledged = true;

    const habitId = params.get("habitId");
    if (habitId) filter.habitId = habitId;

    const reminders = await getRepository().listReminders(filter);
    return ok(reminders);
  });
}

export function POST(request: NextRequest): Promise<Response> {
  return handle(async () => {
    const input = await parseJson(request, reminderInputSchema);
    const reminder = await getRepository().createReminder(input);
    return created(reminder);
  });
}
