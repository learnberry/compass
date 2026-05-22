import { SettingsView } from "@/components/features/settings/settings-view";
import { getRepository } from "@/lib/db/repository";

export const dynamic = "force-dynamic";

/** Settings route — domains, schedule, theme, water habit, templates, push. */
export default async function SettingsPage() {
  const repo = getRepository();

  const [domains, templates, habits, settings] = await Promise.all([
    repo.listDomains(),
    repo.listTemplates(),
    repo.listHabits(),
    repo.getSettings(),
  ]);

  return (
    <SettingsView
      initialDomains={domains}
      initialTemplates={templates}
      habits={habits}
      initialSettings={settings}
    />
  );
}
