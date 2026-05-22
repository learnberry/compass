import { ReviewView } from "@/components/features/review/review-view";
import { getRepository } from "@/lib/db/repository";
import { todayStr } from "@/lib/dates";

export const dynamic = "force-dynamic";

/** Review route — weekly insights across habits and domains. */
export default async function ReviewPage() {
  const repo = getRepository();

  const [habits, domains] = await Promise.all([
    repo.getHabitsWithStatus(todayStr()),
    repo.listDomains(),
  ]);

  return <ReviewView habits={habits} domains={domains} />;
}
