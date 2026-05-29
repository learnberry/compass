import type { NextRequest } from "next/server";

import { handle, ok } from "@/lib/api/respond";
import { shiftDate, todayStr } from "@/lib/dates";
import { getRepository } from "@/lib/db/repository";
import { HEALTH_METRICS, type HealthMetricKind } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isHealthMetric = (v: string | null): v is HealthMetricKind =>
  v != null && (HEALTH_METRICS as readonly string[]).includes(v);

/** Health metrics for the trailing `days` window (default 30), oldest first. */
export function GET(request: NextRequest): Promise<Response> {
  return handle(async () => {
    const params = request.nextUrl.searchParams;
    const days = Math.max(1, Number(params.get("days") ?? "30") || 30);
    const metric = params.get("metric");
    const today = todayStr();

    const metrics = await getRepository().listHealthMetrics({
      from: shiftDate(today, -(days - 1)),
      to: today,
      metric: isHealthMetric(metric) ? metric : undefined,
    });
    return ok(metrics);
  });
}
