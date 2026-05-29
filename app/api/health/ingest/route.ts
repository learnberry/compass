import { NextResponse, type NextRequest } from "next/server";

import { handle, ok } from "@/lib/api/respond";
import { healthIngestSchema, parseJson, type HealthIngestBody } from "@/lib/api/validators";
import { todayStr } from "@/lib/dates";
import { getRepository } from "@/lib/db/repository";
import type { HealthMetricInput, HealthMetricKind } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Default display unit per metric when the payload doesn't specify one. */
const DEFAULT_UNIT: Record<HealthMetricKind, string> = {
  sleep: "h",
  weight: "kg",
  steps: "steps",
  resting_hr: "bpm",
};

/**
 * This endpoint is public at the routing layer (middleware lets it through
 * without a Supabase session) because the iOS Shortcut posting to it carries no
 * auth cookie. It is instead guarded by a shared secret in `HEALTH_INGEST_TOKEN`,
 * sent as `Authorization: Bearer <token>` (or the `x-health-token` header).
 * Fails closed when the env var is unset.
 */
function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.HEALTH_INGEST_TOKEN;
  if (!expected) return false;
  const header = request.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const provided = bearer ?? request.headers.get("x-health-token");
  return provided != null && provided === expected;
}

/**
 * Collapse either payload shape into deduped (date, metric) rows. A duplicate
 * (date, metric) within one request — e.g. set both flat and in `metrics` —
 * keeps the last value, since Postgres rejects an upsert that touches the same
 * conflict target twice in one statement.
 */
function normalize(body: HealthIngestBody): HealthMetricInput[] {
  const fallbackDate = todayStr();
  const byKey = new Map<string, HealthMetricInput>();
  const set = (
    date: string | undefined,
    metric: HealthMetricKind,
    value: number,
    unit: string,
  ): void => {
    const d = date ?? fallbackDate;
    byKey.set(`${d}|${metric}`, { date: d, metric, value, unit });
  };

  if (body.sleep !== undefined) set(body.date, "sleep", body.sleep, "h");
  if (body.weight !== undefined) set(body.date, "weight", body.weight, body.weightUnit ?? "kg");
  if (body.steps !== undefined) set(body.date, "steps", body.steps, "steps");
  if (body.restingHr !== undefined) set(body.date, "resting_hr", body.restingHr, "bpm");

  for (const m of body.metrics ?? []) {
    set(m.date ?? body.date, m.metric, m.value, m.unit ?? DEFAULT_UNIT[m.metric]);
  }

  return [...byKey.values()];
}

export function POST(request: NextRequest): Promise<Response> {
  return handle(async () => {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const body = await parseJson(request, healthIngestSchema);
    const metrics = await getRepository().upsertHealthMetrics(normalize(body));
    return ok({ upserted: metrics.length, metrics });
  });
}
