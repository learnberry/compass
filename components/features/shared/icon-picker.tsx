"use client";

import { cn } from "@/lib/utils";

import { Icon, ICON_NAMES } from "./icon";

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  /** Selected-state accent color. */
  color?: string;
  className?: string;
}

/** A grid for picking a curated lucide icon by name. */
export function IconPicker({
  value,
  onChange,
  color = "var(--primary)",
  className,
}: IconPickerProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-6 gap-2 sm:grid-cols-8",
        className,
      )}
    >
      {ICON_NAMES.map((name) => {
        const selected = value === name;
        return (
          <button
            key={name}
            type="button"
            onClick={() => onChange(name)}
            aria-label={name}
            aria-pressed={selected}
            className={cn(
              "flex aspect-square items-center justify-center rounded-lg border transition-all active:scale-90",
              selected
                ? "border-transparent text-white"
                : "border-border bg-secondary text-muted-foreground",
            )}
            style={selected ? { backgroundColor: color } : undefined}
          >
            <Icon name={name} className="size-5" />
          </button>
        );
      })}
    </div>
  );
}
