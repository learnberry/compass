import { SettingsView } from "@/components/features/settings/settings-view";
import { Button } from "@/components/ui/button";
import { getRepository } from "@/lib/db/repository";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Settings route — domains, schedule, theme, water habit, templates, push. */
export default async function SettingsPage() {
  const repo = getRepository();
  const supabase = await createClient();

  const [domains, templates, habits, settings, { data: userData }] =
    await Promise.all([
      repo.listDomains(),
      repo.listTemplates(),
      repo.listHabits(),
      repo.getSettings(),
      supabase.auth.getUser(),
    ]);

  return (
    <>
      <SettingsView
        initialDomains={domains}
        initialTemplates={templates}
        habits={habits}
        initialSettings={settings}
      />
      <section className="px-4 pb-28">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">Account</p>
            <p className="truncate text-xs text-muted-foreground">
              {userData.user?.email ?? "Signed in"}
            </p>
          </div>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </section>
    </>
  );
}
