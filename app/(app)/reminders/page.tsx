import { RemindersView } from "@/components/features/reminders/reminders-view";
import { getRepository } from "@/lib/db/repository";
import { isoNow } from "@/lib/dates";

export const dynamic = "force-dynamic";

/**
 * Reminders route — the three reminder surfaces (in-app banner, lock-screen
 * push preview, upcoming list). The page resolves reminders plus the habits
 * and domains needed to give each reminder its domain colour + icon, then
 * hands everything to the client `<RemindersView>`.
 */
export default async function RemindersPage() {
  const repo = getRepository();

  const [reminders, due, habits, domains] = await Promise.all([
    repo.listReminders(),
    repo.getDueReminders(isoNow()),
    repo.listHabits(),
    repo.listDomains(),
  ]);

  return (
    <RemindersView
      reminders={reminders}
      due={due}
      habits={habits}
      domains={domains}
    />
  );
}
