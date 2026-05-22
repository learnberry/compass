"use client";

import { useEffect, useRef, useState } from "react";

import type { TimeBlock } from "@/lib/types";
import { clockToMinutes, minutesToClock } from "@/lib/dates";
import { ALERT, withAlpha } from "@/lib/design";

/** Pixels per one-hour row. */
const ROW = 44;
/** Left rail width for hour labels. */
const RAIL = 32;

interface DayGridProps {
  /** First hour shown, 0-23. */
  startHour: number;
  /** Last hour shown, 1-24. */
  endHour: number;
  blocks: TimeBlock[];
  /** Whether the grid represents today (shows the now-line). */
  isToday: boolean;
  onCreateAt: (startTime: string) => void;
  onEditBlock: (block: TimeBlock) => void;
}

/** "5 am", "12 pm", "1 pm" — hour-rail label. */
function hourLabel(h: number): string {
  if (h === 0) return "12 am";
  if (h === 12) return "12 pm";
  return h > 12 ? `${h - 12} pm` : `${h} am`;
}

/** "7:30a" style compact time for the block subline. */
function fmtTime(hhmm: string): string {
  const mins = clockToMinutes(hhmm);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? "p" : "a";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")}${ampm}`;
}

/** An hourly day grid with absolutely-positioned time blocks. */
export function DayGrid({
  startHour,
  endHour,
  blocks,
  isToday,
  onCreateAt,
  onEditBlock,
}: DayGridProps) {
  const [nowMin, setNowMin] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const didScroll = useRef(false);

  // Tick the now-line every minute.
  useEffect(() => {
    if (!isToday) return;
    const id = setInterval(() => {
      const d = new Date();
      setNowMin(d.getHours() * 60 + d.getMinutes());
    }, 60_000);
    return () => clearInterval(id);
  }, [isToday]);

  const gridStartMin = startHour * 60;
  const gridEndMin = endHour * 60;
  const hourCount = endHour - startHour + 1;

  const nowTop =
    isToday && nowMin >= gridStartMin && nowMin <= gridEndMin
      ? ((nowMin - gridStartMin) / 60) * ROW
      : null;

  // Auto-scroll so the now-line is centered in view on first load.
  useEffect(() => {
    if (didScroll.current) return;
    const el = scrollRef.current;
    if (!el) return;
    didScroll.current = true;
    if (nowTop !== null) {
      el.scrollTop = Math.max(0, nowTop - el.clientHeight / 2);
    }
  }, [nowTop]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-6">
      <div
        className="relative"
        style={{ paddingLeft: RAIL + 6, height: hourCount * ROW }}
      >
        {/* Hour rows — divider top border + rail label */}
        {Array.from({ length: hourCount }, (_, i) => {
          const h = startHour + i;
          return (
            <div
              key={h}
              className="absolute left-0 right-0"
              style={{ top: i * ROW, height: ROW }}
            >
              <span
                className="absolute -top-[6px] text-[10px] font-medium text-ink-3"
                style={{ width: RAIL, textAlign: "right" }}
              >
                {hourLabel(h)}
              </span>
              <div
                className="absolute right-0 top-0 border-t border-divider"
                style={{ left: RAIL + 6 }}
              />
              {/* Tap target for creating a block on this hour */}
              <button
                type="button"
                aria-label={`Add block at ${hourLabel(h)}`}
                onClick={() =>
                  onCreateAt(`${String(h).padStart(2, "0")}:00`)
                }
                className="absolute right-0 top-0 h-full transition-colors active:bg-divider/60"
                style={{ left: RAIL + 6 }}
              />
            </div>
          );
        })}

        {/* Time blocks */}
        {blocks.map((block) => {
          const s = clockToMinutes(block.startTime);
          const e = clockToMinutes(block.endTime);
          const top = ((s - gridStartMin) / 60) * ROW;
          const height = Math.max(((e - s) / 60) * ROW - 2, 22);
          const mins = e - s;
          const compact = height < 34;
          return (
            <button
              key={block.id}
              type="button"
              onClick={() => onEditBlock(block)}
              className="absolute z-10 overflow-hidden text-left transition-transform active:scale-[0.985]"
              style={{
                left: RAIL + 6,
                right: 0,
                top,
                height,
                background: withAlpha(block.color, 0.14),
                borderLeft: `3px solid ${block.color}`,
                borderRadius: 10,
                padding: "6px 10px",
              }}
            >
              <p
                className="truncate text-[12px] font-semibold leading-tight tracking-[-0.1px]"
                style={{ color: block.color }}
              >
                {block.title}
              </p>
              {!compact && (
                <p
                  className="mt-px truncate text-[10px] font-medium leading-tight"
                  style={{ color: withAlpha(block.color, 0.75) }}
                >
                  {fmtTime(block.startTime)}–{fmtTime(block.endTime)} ·{" "}
                  {mins} min
                </p>
              )}
            </button>
          );
        })}

        {/* Current-time indicator */}
        {nowTop !== null && (
          <div
            className="pointer-events-none absolute z-20 flex items-center"
            style={{ left: -10, right: 0, top: nowTop }}
          >
            <span
              className="text-[9px] font-bold tnum"
              style={{
                width: 28,
                textAlign: "right",
                marginRight: 4,
                color: ALERT,
              }}
            >
              {minutesToClock(nowMin)}
            </span>
            <span
              className="rounded-full"
              style={{
                width: 8,
                height: 8,
                marginLeft: -4,
                background: ALERT,
              }}
            />
            <span
              className="flex-1"
              style={{ height: 1.5, background: ALERT }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
