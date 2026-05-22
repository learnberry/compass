import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Rounded, domain-tinted square holding a domain/habit icon. */
export function DomainTile({
  icon: Icon,
  solid,
  tint,
  size = 34,
  radius = 10,
  iconSize,
  strokeWidth = 1.75,
  className,
}: {
  icon: LucideIcon;
  solid: string;
  tint: string;
  size?: number;
  radius?: number;
  iconSize?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const isz = iconSize ?? Math.round(size * 0.53);
  return (
    <div
      className={cn("flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size, borderRadius: radius, background: tint }}
    >
      <Icon style={{ width: isz, height: isz, color: solid }} strokeWidth={strokeWidth} />
    </div>
  );
}
