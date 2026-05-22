/**
 * /api/dispatch — fire every due reminder as a push and record it.
 *
 * Exposed on both POST and GET so it can be triggered by the open app (a poll
 * from `useReminders`) and by an external scheduler / cron service hitting a
 * plain URL.
 */

import { handle, ok } from "@/lib/api/respond";
import { dispatchDueReminders } from "@/lib/notifications/dispatcher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function run(): Promise<Response> {
  return handle(async () => {
    const result = await dispatchDueReminders();
    return ok(result);
  });
}

export function POST(): Promise<Response> {
  return run();
}

export function GET(): Promise<Response> {
  return run();
}
