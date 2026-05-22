import { Compass } from "lucide-react";

import { APP_NAME } from "@/lib/constants";
import type { Reminder } from "@/lib/types";

interface PushPreviewProps {
  /** The next upcoming reminder shown inside the lock-screen notification. */
  reminder: Reminder;
}

/**
 * A static preview of the lock-screen push notification — a dark gradient
 * container wrapping a glassmorphic notification card. Populated from the next
 * upcoming reminder.
 */
export function PushPreview({ reminder }: PushPreviewProps) {
  return (
    <div
      className="mb-4 rounded-[18px] p-[18px]"
      style={{
        background: "linear-gradient(135deg, #2C3140 0%, #1A1F2D 100%)",
      }}
    >
      <div
        className="flex items-start gap-2.5 rounded-[14px] px-3 py-2.5 backdrop-blur-xl"
        style={{
          background: "rgba(255,255,255,0.18)",
          border: "0.5px solid rgba(255,255,255,0.12)",
        }}
      >
        <div
          className="flex size-[38px] shrink-0 items-center justify-center rounded-[9px] bg-career"
        >
          <Compass className="size-[22px] text-white" strokeWidth={2} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[13px] font-semibold text-white">
              {APP_NAME.toUpperCase()}
            </span>
            <span className="text-[11px] text-white/75">now</span>
          </div>
          <p className="mt-px text-[14px] font-semibold text-white">
            {reminder.title}
          </p>
          {reminder.body ? (
            <p className="mt-px text-[13px] leading-[1.3] text-white/85">
              {reminder.body}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
