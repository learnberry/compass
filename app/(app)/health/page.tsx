import { HealthView } from "@/components/features/health/health-view";
import { shiftDate, todayStr } from "@/lib/dates";
import { getRepository } from "@/lib/db/repository";

export const dynamic = "force-dynamic";

/** Health route — Apple Health metrics (sleep, weight, steps, resting HR). */
export default async function HealthPage() {
  const today = todayStr();
  const metrics = await getRepository().listHealthMetrics({
    from: shiftDate(today, -29),
    to: today,
  });

  return <HealthView metrics={metrics} />;
}
