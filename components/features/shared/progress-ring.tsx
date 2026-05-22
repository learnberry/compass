import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { clamp } from "@/lib/utils";

interface ProgressRingProps {
  /** 0-100. */
  value: number;
  /** Pixel diameter. */
  size?: number;
  /** Stroke width. */
  stroke?: number;
  /** Ring accent color (hex or CSS color). */
  color?: string;
  /** Centered content. */
  children?: ReactNode;
  className?: string;
}

/** A circular radial progress ring with optional centered content. */
export function ProgressRing({
  value,
  size = 64,
  stroke = 6,
  color = "var(--primary)",
  children,
  className,
}: ProgressRingProps) {
  const pct = clamp(value, 0, 100);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--secondary)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      {children !== undefined && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
