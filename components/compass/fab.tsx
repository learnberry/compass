"use client";

import type { ReactNode } from "react";
import { Plus } from "lucide-react";

import { cn, haptic } from "@/lib/utils";

/** Floating action button — fixed bottom-right, above the tab bar. */
export function Fab({
  onClick,
  label = "Add",
  icon,
  className,
}: {
  onClick?: () => void;
  label?: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        haptic(10);
        onClick?.();
      }}
      className={cn(
        "fixed bottom-[88px] right-5 z-30 flex size-14 items-center justify-center",
        "rounded-full bg-career text-white transition-transform active:scale-95",
        className,
      )}
      style={{
        boxShadow:
          "0 6px 16px rgba(66,133,244,0.4), 0 2px 4px rgba(0,0,0,0.08)",
      }}
    >
      {icon ?? <Plus className="size-6" strokeWidth={2.2} />}
    </button>
  );
}
