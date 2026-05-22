"use client";

import { cn, haptic } from "@/lib/utils";

/** iOS-style segmented control — divider track with a white active pill. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      className={cn("flex gap-0.5 rounded-btn bg-divider p-[3px]", className)}
      role="tablist"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => {
              if (!active) {
                haptic(8);
                onChange(opt.value);
              }
            }}
            className={cn(
              "flex-1 rounded-[10px] font-semibold transition-colors",
              size === "sm" ? "px-1 py-1.5 text-xs" : "px-2 py-[7px] text-[13px]",
              active
                ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                : "text-ink-2",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
