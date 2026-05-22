"use client";

import { Clock } from "lucide-react";

import { DomainTile } from "@/components/compass/domain-tile";
import { ProgressTrack } from "@/components/compass/progress-track";
import { COLORS } from "@/lib/design";
import type { TimeBlock } from "@/lib/types";
import { clockToMinutes, formatClock12 } from "@/lib/dates";

/** Resolve a time block to its accent color, falling back to ink-2. */
function blockColor(block: TimeBlock): string {
  return block.color || COLORS.ink2;
}

/** A card showing the current time block (with live progress) and the next one. */
export function NowNextCard({
  current,
  next,
  nowMinutes,
}: {
  current: TimeBlock | null;
  next: TimeBlock | null;
  /** Current minutes-since-midnight, for the Now-block progress bar. */
  nowMinutes: number;
}) {
  return (
    <div className="overflow-hidden rounded-card border border-hairline bg-surface">
      {current ? (
        <NowBlock block={current} nowMinutes={nowMinutes} />
      ) : (
        <EmptyBlock label="Now" text="Nothing scheduled right now" />
      )}
      <div className="h-px bg-divider" />
      {next ? (
        <NextBlock block={next} />
      ) : (
        <EmptyBlock label="Next" text="Nothing else today" />
      )}
    </div>
  );
}

function NowBlock({
  block,
  nowMinutes,
}: {
  block: TimeBlock;
  nowMinutes: number;
}) {
  const color = blockColor(block);
  const start = clockToMinutes(block.startTime);
  const end = clockToMinutes(block.endTime);
  const span = Math.max(1, end - start);
  const elapsed = Math.min(100, Math.max(0, ((nowMinutes - start) / span) * 100));

  return (
    <div className="relative px-4 py-3.5">
      <span
        className="absolute inset-y-3 left-0 w-[3px] rounded-sm"
        style={{ background: color }}
      />
      <div className="mb-1 flex items-center gap-2">
        <span
          className="size-1.5 rounded-full animate-pulse-dot"
          style={{ background: color }}
        />
        <span
          className="text-[11px] font-bold tracking-[0.4px]"
          style={{ color }}
        >
          Now
        </span>
        <span className="text-[11px] font-medium text-ink-2 tnum">
          {formatClock12(block.startTime)} – {formatClock12(block.endTime)}
        </span>
      </div>
      <div className="text-[15px] font-semibold tracking-[-0.2px] text-ink">
        {block.title}
      </div>
      <div className="mt-2">
        <ProgressTrack value={elapsed} color={color} height={4} />
      </div>
    </div>
  );
}

function NextBlock({ block }: { block: TimeBlock }) {
  const color = blockColor(block);
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <DomainTile
        icon={Clock}
        solid={color}
        tint={`${color}1F`}
        iconSize={16}
      />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold tracking-[0.4px] text-ink-2">
          Next
        </div>
        <div className="mt-px truncate text-sm font-semibold text-ink">
          {block.title}
        </div>
      </div>
      <div className="text-xs font-medium text-ink-2 tnum">
        {formatClock12(block.startTime)}
      </div>
    </div>
  );
}

function EmptyBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <DomainTile
        icon={Clock}
        solid={COLORS.ink3}
        tint={COLORS.divider}
        iconSize={16}
      />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold tracking-[0.4px] text-ink-2">
          {label}
        </div>
        <div className="mt-px text-sm font-medium text-ink-3">{text}</div>
      </div>
    </div>
  );
}
