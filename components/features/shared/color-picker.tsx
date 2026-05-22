"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/** A curated palette for domains, habits and blocks. */
export const PALETTE = [
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#f59e0b",
  "#ec4899",
  "#14b8a6",
  "#f43f5e",
  "#6366f1",
  "#ef4444",
  "#eab308",
  "#06b6d4",
  "#8b5cf6",
] as const;

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

/** A swatch grid for picking a hex accent color. */
export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {PALETTE.map((color) => {
        const selected = value.toLowerCase() === color.toLowerCase();
        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            aria-label={`Color ${color}`}
            aria-pressed={selected}
            className={cn(
              "flex size-9 items-center justify-center rounded-full transition-transform active:scale-90",
              selected && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
            )}
            style={{ backgroundColor: color }}
          >
            {selected && <Check className="size-4 text-white" strokeWidth={3} />}
          </button>
        );
      })}
    </div>
  );
}
