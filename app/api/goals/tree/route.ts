import { handle, ok } from "@/lib/api/respond";
import { getRepository } from "@/lib/db/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): Promise<Response> {
  return handle(async () => {
    const tree = await getRepository().getGoalTree();
    return ok(tree);
  });
}
