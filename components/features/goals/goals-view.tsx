"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Target } from "lucide-react";

import { Fab } from "@/components/compass/fab";
import { SegmentedControl } from "@/components/compass/segmented-control";
import { GoalDialog } from "@/components/features/goals/goal-dialog";
import { GoalNode } from "@/components/features/goals/goal-node";
import { api } from "@/lib/api-client";
import type { Domain, Goal, GoalLevel, GoalWithProgress } from "@/lib/types";

interface GoalsViewProps {
  initialTree: GoalWithProgress[];
  domains: Domain[];
}

const LEVEL_OPTIONS: { value: GoalLevel; label: string }[] = [
  { value: "life", label: "Life" },
  { value: "yearly", label: "Yearly" },
  { value: "monthly", label: "Monthly" },
  { value: "daily", label: "Daily" },
];

const LEVEL_STORAGE_KEY = "compass_goal_level";

/** Flatten the goal tree, keeping each node's nested `children` intact. */
function flatten(nodes: GoalWithProgress[]): GoalWithProgress[] {
  const out: GoalWithProgress[] = [];
  const walk = (n: GoalWithProgress) => {
    out.push(n);
    n.children.forEach(walk);
  };
  nodes.forEach(walk);
  return out;
}

/** The Goals screen — a level-filtered hierarchy tree. */
export function GoalsView({ initialTree, domains }: GoalsViewProps) {
  const [tree, setTree] = useState(initialTree);
  const [level, setLevel] = useState<GoalLevel>("yearly");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | undefined>(undefined);

  // Restore the last viewed level.
  useEffect(() => {
    const saved = window.localStorage.getItem(LEVEL_STORAGE_KEY);
    if (saved === "life" || saved === "yearly" || saved === "monthly" || saved === "daily") {
      setLevel(saved);
    }
  }, []);

  const domainsById = useMemo(() => {
    const m = new Map<string, Domain>();
    for (const d of domains) m.set(d.id, d);
    return m;
  }, [domains]);

  const allGoals = useMemo(() => flatten(tree), [tree]);
  const goalsAtLevel = useMemo(
    () => allGoals.filter((g) => g.level === level),
    [allGoals, level],
  );

  const refresh = useCallback(async () => {
    try {
      setTree(await api.goals.tree());
    } catch {
      /* keep current tree */
    }
  }, []);

  function changeLevel(next: GoalLevel) {
    setLevel(next);
    window.localStorage.setItem(LEVEL_STORAGE_KEY, next);
  }

  function openCreate() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(goal: Goal) {
    setEditing(goal);
    setDialogOpen(true);
  }

  return (
    <div className="pt-safe">
      <header className="px-5 pb-1 pt-2">
        <div className="flex items-baseline justify-between">
          <h1 className="text-[26px] font-bold tracking-[-0.5px] text-ink">Goals</h1>
          <span className="text-xs font-medium text-ink-2 tnum">
            {new Date().getFullYear()}
          </span>
        </div>
      </header>

      <div className="px-5 py-3">
        <SegmentedControl
          options={LEVEL_OPTIONS}
          value={level}
          onChange={changeLevel}
          size="sm"
        />
      </div>

      <div className="px-5 pb-[96px]">
        {goalsAtLevel.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-3 rounded-card border border-dashed border-hairline bg-surface py-14 text-center">
            <Target className="size-7 text-ink-3" strokeWidth={1.75} />
            <p className="px-8 text-[13px] text-ink-2">
              No {level} goals yet. Tap + to add one.
            </p>
          </div>
        ) : (
          goalsAtLevel.map((goal) => (
            <GoalNode
              key={goal.id}
              goal={goal}
              domainsById={domainsById}
              defaultExpanded
              onSelect={openEdit}
            />
          ))
        )}
      </div>

      <Fab label="New goal" onClick={openCreate} />

      <GoalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        goal={editing}
        defaultLevel={editing ? undefined : level}
        domains={domains}
        allGoals={allGoals}
        onSaved={refresh}
      />
    </div>
  );
}
