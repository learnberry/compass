import { GoalsView } from "@/components/features/goals/goals-view";
import { getRepository } from "@/lib/db/repository";

export const dynamic = "force-dynamic";

/** Goals route — the life→yearly→monthly→daily hierarchy tree. */
export default async function GoalsPage() {
  const repo = getRepository();

  const [tree, domains] = await Promise.all([
    repo.getGoalTree(),
    repo.listDomains(),
  ]);

  return <GoalsView initialTree={tree} domains={domains} />;
}
