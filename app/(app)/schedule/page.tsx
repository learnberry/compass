import { ScheduleView } from "@/components/features/schedule/schedule-view";
import { getRepository } from "@/lib/db/repository";
import { todayStr } from "@/lib/dates";

export const dynamic = "force-dynamic";

/** Schedule route — today's time-blocked day view. */
export default async function SchedulePage() {
  const repo = getRepository();
  const today = todayStr();

  const [blocks, domains, habits, goals, templates, settings] =
    await Promise.all([
      repo.listTimeBlocks(today),
      repo.listDomains(),
      repo.listHabits(),
      repo.listGoals(),
      repo.listTemplates(),
      repo.getSettings(),
    ]);

  return (
    <ScheduleView
      initialDate={today}
      initialBlocks={blocks}
      domains={domains}
      habits={habits}
      goals={goals}
      initialTemplates={templates}
      settings={settings}
    />
  );
}
