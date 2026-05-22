import type { NextRequest } from "next/server";

import { handle, noContent } from "@/lib/api/respond";
import { getRepository } from "@/lib/db/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export function DELETE(_request: NextRequest, { params }: Params): Promise<Response> {
  return handle(async () => {
    const { id } = await params;
    await getRepository().deleteHabitLog(id);
    return noContent();
  });
}
