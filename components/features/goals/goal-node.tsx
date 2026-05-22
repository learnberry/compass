"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { ProgressTrack } from "@/components/compass/progress-track";
import { domainVisual } from "@/lib/design";
import type { Domain, GoalWithProgress } from "@/lib/types";
import { haptic } from "@/lib/utils";

/** Short due-date label, e.g. "Sep 30", or "Ongoing" when there's no target. */
function dueLabel(targetDate: string | null): string {
  if (!targetDate) return "Ongoing";
  // Parse "YYYY-MM-DD" as a local date (avoid UTC shift from `new Date(str)`).
  const [y, m, d] = targetDate.split("-").map(Number);
  if (!y || !m || !d) return "Ongoing";
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Resolve a goal's domain accent color via the handoff palette. */
function accentFor(
  goal: GoalWithProgress,
  domainsById: Map<string, Domain>,
): string {
  const domain = goal.domainId ? domainsById.get(goal.domainId) : undefined;
  return domainVisual(domain ?? null).solid;
}

interface ChildCardProps {
  goal: GoalWithProgress;
  domainsById: Map<string, Domain>;
  onSelect: (goal: GoalWithProgress) => void;
}

/** A nested child goal card, rendered inside an expanded parent. */
function ChildCard({ goal, domainsById, onSelect }: ChildCardProps) {
  const accent = accentFor(goal, domainsById);

  return (
    <div className="relative mb-1.5 last:mb-0">
      {/* Horizontal stub connecting the card to the vertical rail. */}
      <div
        className="absolute top-[18px] h-0.5 w-3 rounded-full bg-divider"
        style={{ left: -13 }}
      />
      <button
        type="button"
        onClick={() => {
          haptic(8);
          onSelect(goal);
        }}
        className="w-full rounded-xl border border-hairline bg-surface px-3 py-2.5 text-left transition-transform active:scale-[0.99]"
      >
        <div className="mb-1.5 flex items-center gap-2">
          <span
            className="size-1.5 shrink-0 rounded-full"
            style={{ background: accent }}
          />
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium tracking-[-0.1px] text-ink">
            {goal.title}
          </span>
          <span className="shrink-0 text-[11px] font-semibold tabular-nums text-ink-2">
            {goal.computedProgress}%
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <ProgressTrack
            value={goal.computedProgress}
            color={accent}
            height={4}
            className="flex-1"
          />
          <span className="shrink-0 text-[9px] font-semibold text-ink-3">
            {dueLabel(goal.targetDate)}
          </span>
        </div>
      </button>
    </div>
  );
}

interface GoalNodeProps {
  goal: GoalWithProgress;
  domainsById: Map<string, Domain>;
  /** Whether this parent starts expanded. */
  defaultExpanded?: boolean;
  /** Tapping a goal card (parent or child) — opens the edit dialog. */
  onSelect: (goal: GoalWithProgress) => void;
}

/** A parent goal card with an expandable list of its direct children. */
export function GoalNode({
  goal,
  domainsById,
  defaultExpanded = false,
  onSelect,
}: GoalNodeProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const accent = accentFor(goal, domainsById);
  const children = goal.children;
  const hasChildren = children.length > 0;

  function toggle() {
    haptic(8);
    setExpanded((v) => !v);
  }

  return (
    <div className="mb-2.5 last:mb-0">
      {/* Parent card */}
      <div
        role={hasChildren ? "button" : undefined}
        tabIndex={hasChildren ? 0 : undefined}
        onClick={hasChildren ? toggle : () => onSelect(goal)}
        onKeyDown={
          hasChildren
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggle();
                }
              }
            : undefined
        }
        className="cursor-pointer rounded-[14px] border border-hairline bg-surface p-3.5 transition-transform active:scale-[0.995]"
      >
        <div className="mb-2 flex items-center gap-2.5">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ background: accent }}
          />
          <span className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-[-0.2px] text-ink">
            {goal.title}
          </span>
          <span className="shrink-0 text-xs font-semibold tabular-nums text-ink-2">
            {goal.computedProgress}%
          </span>
          {hasChildren && (
            <ChevronDown
              className="size-4 shrink-0 text-ink-2 transition-transform duration-200"
              strokeWidth={1.75}
              style={{ transform: expanded ? "rotate(180deg)" : "none" }}
            />
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <ProgressTrack
            value={goal.computedProgress}
            color={accent}
            height={6}
            className="flex-1"
          />
          <span className="shrink-0 rounded-full bg-divider px-2 py-0.5 text-[10px] font-semibold text-ink-2">
            {dueLabel(goal.targetDate)}
          </span>
        </div>
      </div>

      {/* Children — revealed when the parent is expanded */}
      {hasChildren && expanded && (
        <div className="relative mt-1.5 pl-[22px]">
          {/* Vertical rail down the left, stopping 14px above the bottom. */}
          <div
            className="absolute top-0 w-0.5 rounded-full bg-divider"
            style={{ left: 9, bottom: 14 }}
          />
          {children.map((child) => (
            <ChildCard
              key={child.id}
              goal={child}
              domainsById={domainsById}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
