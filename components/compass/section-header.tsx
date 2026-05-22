import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Section label (13/600) with an optional trailing count/meta on the right. */
export function SectionHeader({
  title,
  trail,
  className,
}: {
  title: string;
  trail?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-1 mb-2.5 mt-1 flex items-baseline justify-between", className)}>
      <h2 className="text-[13px] font-semibold tracking-[-0.1px] text-ink">{title}</h2>
      {trail != null && (
        <span className="text-xs font-medium text-ink-2">{trail}</span>
      )}
    </div>
  );
}
