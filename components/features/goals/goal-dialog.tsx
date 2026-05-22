"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  GOAL_LEVELS,
  GOAL_STATUSES,
  type Domain,
  type Goal,
  type GoalInput,
  type GoalLevel,
  type GoalStatus,
} from "@/lib/types";
import { api } from "@/lib/api-client";

const NONE = "__none__";

const LEVEL_LABEL: Record<GoalLevel, string> = {
  life: "Life",
  yearly: "Yearly",
  monthly: "Monthly",
  daily: "Daily",
};

/** The level directly above a given level, or null for "life". */
function parentLevel(level: GoalLevel): GoalLevel | null {
  const i = GOAL_LEVELS.indexOf(level);
  return i > 0 ? GOAL_LEVELS[i - 1] : null;
}

interface GoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing goal to edit, or undefined to create. */
  goal?: Goal;
  /** Pre-selected level when creating. */
  defaultLevel?: GoalLevel;
  /** Pre-selected parent when creating from a parent goal. */
  defaultParentId?: string | null;
  domains: Domain[];
  /** All goals — used to populate the parent selector. */
  allGoals: Goal[];
  onSaved: () => void;
}

/** Create / edit goal dialog covering the four-level hierarchy. */
export function GoalDialog({
  open,
  onOpenChange,
  goal,
  defaultLevel,
  defaultParentId,
  domains,
  allGoals,
  onSaved,
}: GoalDialogProps) {
  const [level, setLevel] = useState<GoalLevel>("life");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState<string>(NONE);
  const [domainId, setDomainId] = useState<string>(NONE);
  const [targetDate, setTargetDate] = useState("");
  const [status, setStatus] = useState<GoalStatus>("active");
  const [overrideOn, setOverrideOn] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (goal) {
      setLevel(goal.level);
      setTitle(goal.title);
      setDescription(goal.description ?? "");
      setParentId(goal.parentId ?? NONE);
      setDomainId(goal.domainId ?? NONE);
      setTargetDate(goal.targetDate ?? "");
      setStatus(goal.status);
      setOverrideOn(goal.progress !== null);
      setProgress(goal.progress ?? 0);
    } else {
      setLevel(defaultLevel ?? "life");
      setTitle("");
      setDescription("");
      setParentId(defaultParentId ?? NONE);
      setDomainId(domains[0]?.id ?? NONE);
      setTargetDate("");
      setStatus("active");
      setOverrideOn(false);
      setProgress(0);
    }
  }, [open, goal, defaultLevel, defaultParentId, domains]);

  const plevel = parentLevel(level);

  const parentOptions = useMemo(
    () => (plevel ? allGoals.filter((g) => g.level === plevel) : []),
    [plevel, allGoals],
  );

  async function handleSave() {
    if (title.trim() === "") {
      toast.error("Give the goal a title");
      return;
    }
    if (plevel && parentId === NONE) {
      toast.error(`Pick a ${LEVEL_LABEL[plevel].toLowerCase()} parent goal`);
      return;
    }
    const payload: GoalInput = {
      level,
      title: title.trim(),
      description: description.trim() || null,
      parentId: plevel ? (parentId === NONE ? null : parentId) : null,
      domainId: domainId === NONE ? null : domainId,
      targetDate: targetDate || null,
      status,
      progress: overrideOn ? progress : null,
    };

    setSaving(true);
    try {
      if (goal) {
        await api.goals.update(goal.id, payload);
        toast.success("Goal updated");
      } else {
        await api.goals.create(payload);
        toast.success("Goal created");
      }
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("Couldn't save goal");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{goal ? "Edit goal" : "New goal"}</DialogTitle>
          <DialogDescription>
            Goals roll up: daily feeds monthly, monthly feeds yearly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Level</Label>
            <Select
              value={level}
              onValueChange={(v) => {
                setLevel(v as GoalLevel);
                setParentId(NONE);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GOAL_LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {LEVEL_LABEL[l]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="goal-title">Title</Label>
            <Input
              id="goal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Launch the business MVP"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="goal-desc">Description</Label>
            <Textarea
              id="goal-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional context"
              rows={2}
            />
          </div>

          {plevel && (
            <div className="space-y-1.5">
              <Label>Parent goal ({LEVEL_LABEL[plevel]})</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a parent goal" />
                </SelectTrigger>
                <SelectContent>
                  {parentOptions.length === 0 ? (
                    <SelectItem value={NONE} disabled>
                      No {LEVEL_LABEL[plevel].toLowerCase()} goals yet
                    </SelectItem>
                  ) : (
                    parentOptions.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Domain</Label>
            <Select value={domainId} onValueChange={setDomainId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a domain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>No domain</SelectItem>
                {domains.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="goal-date">Target date</Label>
              <Input
                id="goal-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as GoalStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s[0].toUpperCase() + s.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2 rounded-lg bg-secondary/50 p-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="override">Manual progress override</Label>
              <Switch
                id="override"
                checked={overrideOn}
                onCheckedChange={setOverrideOn}
              />
            </div>
            {overrideOn && (
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  className="h-2 flex-1 accent-primary"
                />
                <span className="w-10 text-right text-sm font-semibold tabular-nums">
                  {progress}%
                </span>
              </div>
            )}
            {!overrideOn && (
              <p className="text-xs text-muted-foreground">
                Progress rolls up from child goals automatically.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : goal ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
