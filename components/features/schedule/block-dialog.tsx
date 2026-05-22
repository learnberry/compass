"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
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
import type {
  Domain,
  Goal,
  Habit,
  TimeBlock,
  TimeBlockInput,
} from "@/lib/types";
import { api } from "@/lib/api-client";
import { clockToMinutes, minutesToClock } from "@/lib/dates";
import { domainVisual } from "@/lib/design";
import { cn, haptic } from "@/lib/utils";

const NONE = "__none__";

interface BlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  /** Existing block to edit, or undefined to create. */
  block?: TimeBlock;
  /** Default start time when creating from an empty slot. */
  defaultStart?: string;
  domains: Domain[];
  habits: Habit[];
  goals: Goal[];
  onSaved: () => void;
}

/** Create / edit a schedule time block. */
export function BlockDialog({
  open,
  onOpenChange,
  date,
  block,
  defaultStart,
  domains,
  habits,
  goals,
  onSaved,
}: BlockDialogProps) {
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [domainId, setDomainId] = useState<string>(NONE);
  const [habitId, setHabitId] = useState<string>(NONE);
  const [goalId, setGoalId] = useState<string>(NONE);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (block) {
      setTitle(block.title);
      setStart(block.startTime);
      setEnd(block.endTime);
      const d = domains.find((x) => x.color === block.color);
      setDomainId(d?.id ?? domains[0]?.id ?? NONE);
      setHabitId(block.habitId ?? NONE);
      setGoalId(block.goalId ?? NONE);
    } else {
      const s = defaultStart ?? "09:00";
      setTitle("");
      setStart(s);
      setEnd(minutesToClock(Math.min(clockToMinutes(s) + 60, 23 * 60 + 59)));
      setDomainId(domains[0]?.id ?? NONE);
      setHabitId(NONE);
      setGoalId(NONE);
    }
  }, [open, block, defaultStart, domains]);

  const selectedDomain = useMemo(
    () => domains.find((d) => d.id === domainId),
    [domains, domainId],
  );

  async function handleSave() {
    if (title.trim() === "") {
      toast.error("Give the block a title");
      return;
    }
    if (clockToMinutes(end) <= clockToMinutes(start)) {
      toast.error("End time must be after start");
      return;
    }
    const color = selectedDomain
      ? domainVisual(selectedDomain).solid
      : "#4285F4";
    const payload: TimeBlockInput = {
      date,
      startTime: start,
      endTime: end,
      title: title.trim(),
      habitId: habitId === NONE ? null : habitId,
      goalId: goalId === NONE ? null : goalId,
      color,
    };

    haptic(12);
    setSaving(true);
    try {
      if (block) {
        await api.timeBlocks.update(block.id, payload);
        toast.success("Block updated");
      } else {
        await api.timeBlocks.create(payload);
        toast.success("Block added");
      }
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("Couldn't save block");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!block) return;
    haptic(12);
    setSaving(true);
    try {
      await api.timeBlocks.remove(block.id);
      toast.success("Block deleted");
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("Couldn't delete block");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-card border-hairline bg-surface">
        <DialogHeader>
          <DialogTitle className="text-[17px] font-semibold tracking-[-0.3px] text-ink">
            {block ? "Edit block" : "New block"}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-ink-2">
            Plan a slice of your day.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="block-title" className="text-[13px] text-ink-2">
              Title
            </Label>
            <Input
              id="block-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Deep work"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="block-start" className="text-[13px] text-ink-2">
                Start
              </Label>
              <Input
                id="block-start"
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="block-end" className="text-[13px] text-ink-2">
                End
              </Label>
              <Input
                id="block-end"
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px] text-ink-2">Domain</Label>
            <div className="flex flex-wrap gap-2">
              {domains.map((d) => {
                const v = domainVisual(d);
                const active = d.id === domainId;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      haptic(8);
                      setDomainId(d.id);
                    }}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1.5",
                      "text-[12px] font-semibold transition-colors",
                      active
                        ? "border-transparent"
                        : "border-hairline bg-surface text-ink-2",
                    )}
                    style={
                      active
                        ? { background: v.tint, color: v.solid }
                        : undefined
                    }
                  >
                    <span
                      className="size-2 rounded-full"
                      style={{ background: v.solid }}
                    />
                    {d.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px] text-ink-2">
              Linked habit (optional)
            </Label>
            <Select value={habitId} onValueChange={setHabitId}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {habits.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px] text-ink-2">
              Linked goal (optional)
            </Label>
            <Select value={goalId} onValueChange={setGoalId}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {goals.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {block && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
              className="mr-auto gap-1.5"
            >
              <Trash2 className="size-4" /> Delete
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : block ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
