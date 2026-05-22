import { DashboardView } from "@/components/features/dashboard/dashboard-view";
import { getRepository } from "@/lib/db/repository";
import { todayStr } from "@/lib/dates";

export const dynamic = "force-dynamic";

/** Home — the daily dashboard. Loads today's data on the server. */
export default async function DashboardPage() {
  const repo = getRepository();
  const today = todayStr();

  const [habits, domains, blocks, goals, settings] = await Promise.all([
    repo.getHabitsWithStatus(today),
    repo.listDomains(),
    repo.listTimeBlocks(today),
    repo.listGoals({ level: "yearly", status: "active" }),
    repo.getSettings(),
  ]);

  return (
    <DashboardView
      initialHabits={habits}
      initialDomains={domains}
      initialBlocks={blocks}
      initialGoals={goals}
      initialSettings={settings}
    />
  );
}
