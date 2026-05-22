"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
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
import {
  HABIT_ICON_CHOICES,
  domainVisual,
  iconByName,
} from "@/lib/design";
import type {
  Domain,
  Habit,
  HabitFrequencyConfig,
  HabitFrequencyType,
  HabitInput,
} from "@/lib/types";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const WEEKDAYS = [
  { i: 1, label: "M" },
  { i: 2, label: "T" },
  { i: 3, label: "W" },
  { i: 4, label: "T" },
  { i: 5, label: "F" },
  { i: 6, label: "S" },
  { i: 0, label: "S" },
] as const;

interface HabitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing habit to edit, or undefined to create. */
  habit?: Habit;
  domains: Domain[];
  onSaved: () => void;
}

/** Create / edit habit dialog — name, domain, frequency, target, icon, reminders. */
export function HabitDialog({
  open,
  onOpenChange,
  habit,
  domains,
  onSaved,
}: HabitDialogProps) {
  const [name, setName] = useState("");
  const [domainId, setDomainId] = useState<string>("");
  const [freqType, setFreqType] = useState<HabitFrequencyType>("daily");
  const [timesPerWeek, setTimesPerWeek] = useState(3);
  const [weekdays, setWeekdays] = useState<number[]>([1, 3, 5]);
  const [targetValue, setTargetValue] = useState(1);
  const [unit, setUnit] = useState("");
  const [icon, setIcon] = useState("Dumbbell");
  const [reminders, setReminders] = useState<string[]>([]);
  const [newReminder, setNewReminder] = useState("08:00");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (habit) {
      setName(habit.name);
      setDomainId(habit.domainId ?? "");
      setFreqType(habit.frequencyType);
      setTimesPerWeek(habit.frequencyConfig.timesPerWeek ?? 3);
      setWeekdays(habit.frequencyConfig.weekdays ?? [1, 3, 5]);
      setTargetValue(habit.targetValue);
      setUnit(habit.unit);
      setIcon(habit.icon || "Dumbbell");
      setReminders(habit.reminderTimes);
    } else {
      setName("");
      setDomainId(domains[0]?.id ?? "");
      setFreqType("daily");
      setTimesPerWeek(3);
      setWeekdays([1, 3, 5]);
      setTargetValue(1);
      setUnit("");
      setIcon("Dumbbell");
      setReminders([]);
    }
    setNewReminder("08:00");
  }, [open, habit, domains]);

  // Accent for the icon picker — follows the selected domain.
  const accent = domainVisual(
    domains.find((d) => d.id === domainId),
  ).solid;

  function toggleWeekday(i: number) {
    setWeekdays((prev) =>
      prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i],
    );
  }

  function addReminder() {
    if (!/^\d{2}:\d{2}$/.test(newReminder)) return;
    if (reminders.includes(newReminder)) return;
    setReminders((prev) => [...prev, newReminder].sort());
  }

  async function handleSave() {
    if (name.trim() === "") {
      toast.error("Give your habit a name");
      return;
    }
    const config: HabitFrequencyConfig = {};
    if (freqType === "weekly_count") config.timesPerWeek = timesPerWeek;
    if (freqType === "specific_days") config.weekdays = weekdays;

    const payload: HabitInput = {
      name: name.trim(),
      domainId: domainId || null,
      frequencyType: freqType,
      frequencyConfig: config,
      targetValue: Math.max(1, targetValue),
      unit: unit.trim(),
      icon,
      color: habit?.color ?? "",
      reminderTimes: reminders,
    };

    setSaving(true);
    try {
      if (habit) {
        await api.habits.update(habit.id, payload);
        toast.success("Habit updated");
      } else {
        await api.habits.create(payload);
        toast.success("Habit created");
      }
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("Couldn't save habit");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-card">
        <DialogHeader>
          <DialogTitle>{habit ? "Edit habit" : "New habit"}</DialogTitle>
          <DialogDescription>
            Track something you want to do consistently.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="habit-name">Name</Label>
            <Input
              id="habit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Drink water"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Domain</Label>
            <Select value={domainId} onValueChange={setDomainId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a domain" />
              </SelectTrigger>
              <SelectContent>
                {domains.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Frequency</Label>
            <Select
              value={freqType}
              onValueChange={(v) => setFreqType(v as HabitFrequencyType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Every day</SelectItem>
                <SelectItem value="weekly_count">N× per week</SelectItem>
                <SelectItem value="specific_days">Specific days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {freqType === "weekly_count" && (
            <div className="space-y-1.5">
              <Label htmlFor="times-week">Times per week</Label>
              <Input
                id="times-week"
                type="number"
                min={1}
                max={7}
                value={timesPerWeek}
                onChange={(e) => setTimesPerWeek(Number(e.target.value))}
              />
            </div>
          )}

          {freqType === "specific_days" && (
            <div className="space-y-1.5">
              <Label>Days</Label>
              <div className="flex gap-1.5">
                {WEEKDAYS.map(({ i, label }) => {
                  const on = weekdays.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleWeekday(i)}
                      className={cn(
                        "flex size-10 items-center justify-center rounded-full border border-hairline text-sm font-semibold transition-transform active:scale-90",
                        !on && "text-ink-2",
                      )}
                      style={
                        on
                          ? {
                              backgroundColor: accent,
                              color: "#fff",
                              borderColor: "transparent",
                            }
                          : undefined
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="target">Daily target</Label>
              <Input
                id="target"
                type="number"
                min={1}
                value={targetValue}
                onChange={(e) => setTargetValue(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="L, min — blank = binary"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Icon</Label>
            <div className="grid grid-cols-8 gap-2">
              {HABIT_ICON_CHOICES.map((name) => {
                const Ico = iconByName(name);
                const selected = icon === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setIcon(name)}
                    aria-label={name}
                    aria-pressed={selected}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-tile border transition-all active:scale-90",
                      selected
                        ? "border-transparent text-white"
                        : "border-hairline bg-divider text-ink-2",
                    )}
                    style={
                      selected ? { backgroundColor: accent } : undefined
                    }
                  >
                    <Ico className="size-5" strokeWidth={1.75} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Reminders</Label>
            {reminders.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {reminders.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-full bg-divider px-2.5 py-1 text-sm font-medium tnum"
                  >
                    {t}
                    <button
                      type="button"
                      aria-label={`Remove reminder ${t}`}
                      onClick={() =>
                        setReminders((prev) => prev.filter((x) => x !== t))
                      }
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                type="time"
                value={newReminder}
                onChange={(e) => setNewReminder(e.target.value)}
              />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={addReminder}
                aria-label="Add reminder"
              >
                <Plus className="size-5" />
              </Button>
            </div>
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
            {saving ? "Saving…" : habit ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
