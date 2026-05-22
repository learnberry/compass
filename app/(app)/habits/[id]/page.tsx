import { notFound } from "next/navigation";

import { HabitDetailView } from "@/components/features/habits/habit-detail-view";
import { getRepository } from "@/lib/db/repository";
import { todayStr } from "@/lib/dates";

export const dynamic = "force-dynamic";

/** Habit detail route — heatmap, streaks and completion breakdown. */
export default async function HabitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const repo = getRepository();

  const habit = await repo.getHabit(id);
  if (!habit) notFound();

  const [stats, domains] = await Promise.all([
    repo.getHabitStats(id, todayStr()),
    repo.listDomains(),
  ]);

  const domain = habit.domainId
    ? domains.find((d) => d.id === habit.domainId)
    : undefined;

  return (
    <HabitDetailView
      habit={habit}
      domain={domain}
      stats={stats}
      domains={domains}
    />
  );
}
