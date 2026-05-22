"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";

import { cn } from "@/lib/utils";

/** 38px round bordered icon button used in screen headers. */
export const CircleButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement>
>(function CircleButton({ className, type = "button", ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "flex size-[38px] shrink-0 items-center justify-center rounded-full",
        "border border-hairline bg-surface text-ink-2",
        "transition-transform active:scale-95",
        className,
      )}
      {...props}
    />
  );
});
