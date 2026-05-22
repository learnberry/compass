import type { Domain } from "@/lib/types";
import { cn } from "@/lib/utils";

import { Icon } from "./icon";

interface DomainChipProps {
  domain: Domain | undefined;
  /** Show the domain icon alongside the label. */
  withIcon?: boolean;
  className?: string;
}

/** A small colored pill identifying a life domain. */
export function DomainChip({ domain, withIcon = false, className }: DomainChipProps) {
  if (!domain) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[0.7rem] font-medium text-muted-foreground",
          className,
        )}
      >
        No domain
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-medium",
        className,
      )}
      style={{
        color: domain.color,
        backgroundColor: `${domain.color}1f`,
      }}
    >
      {withIcon && <Icon name={domain.icon} className="size-3" />}
      {domain.name}
    </span>
  );
}
