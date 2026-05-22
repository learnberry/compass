import { handle, ok } from "@/lib/api/respond";
import { getRepository } from "@/lib/db/repository";
import { isoNow } from "@/lib/dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): Promise<Response> {
  return handle(async () => {
    const reminders = await getRepository().getDueReminders(isoNow());
    return ok(reminders);
  });
}
