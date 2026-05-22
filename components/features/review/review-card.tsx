import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** White card with a 1px hairline border (no shadow), 16px padding by default. */
export function ReviewCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-card border border-hairline bg-surface p-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
