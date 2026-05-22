import { HabitsView } from "@/components/features/habits/habits-view";
import { getRepository } from "@/lib/db/repository";
import { todayStr } from "@/lib/dates";

export const dynamic = "force-dynamic";

/** Habits list route — every active habit with its streak and 7-day status. */
export default async function HabitsPage() {
  const repo = getRepository();

  const [habits, domains] = await Promise.all([
    repo.getHabitsWithStatus(todayStr()),
    repo.listDomains(),
  ]);

  return <HabitsView initialHabits={habits} domains={domains} />;
}
