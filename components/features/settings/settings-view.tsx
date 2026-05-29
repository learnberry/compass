"use client";

import { useState } from "react";
import {
  BookOpen,
  Droplet,
  LayoutTemplate,
  Minus,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { DomainDialog } from "@/components/features/settings/domain-dialog";
import { Icon } from "@/components/features/shared/icon";
import { PushSettings } from "@/components/notifications/push-settings";
import { ThemeToggle } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  AppSettings,
  BlockTemplate,
  Domain,
  Habit,
} from "@/lib/types";
import { api } from "@/lib/api-client";
import { clamp } from "@/lib/utils";

const NONE = "__none__";

interface SettingsViewProps {
  initialDomains: Domain[];
  initialTemplates: BlockTemplate[];
  habits: Habit[];
  initialSettings: AppSettings;
}

/** The Settings page — domains, schedule, theme, water habit, templates, push. */
export function SettingsView({
  initialDomains,
  initialTemplates,
  habits,
  initialSettings,
}: SettingsViewProps) {
  const [domains, setDomains] = useState(initialDomains);
  const [templates, setTemplates] = useState(initialTemplates);
  const [settings, setSettings] = useState(initialSettings);
  const [domainDialogOpen, setDomainDialogOpen] = useState(false);
  const [editingDomain, setEditingDomain] = useState<Domain | undefined>(
    undefined,
  );

  async function refreshDomains() {
    try {
      setDomains(await api.domains.list());
    } catch {
      /* keep current */
    }
  }

  async function patchSettings(patch: Partial<AppSettings>) {
    const prev = settings;
    setSettings({ ...settings, ...patch });
    try {
      const next = await api.settings.update(patch);
      setSettings(next);
    } catch {
      setSettings(prev);
      toast.error("Couldn't save setting");
    }
  }

  async function deleteDomain(domain: Domain) {
    try {
      await api.domains.remove(domain.id);
      toast.success("Domain deleted");
      refreshDomains();
    } catch {
      toast.error("Couldn't delete domain");
    }
  }

  async function renameTemplate(template: BlockTemplate, name: string) {
    const trimmed = name.trim();
    if (trimmed === "" || trimmed === template.name) return;
    try {
      await api.templates.update(template.id, { name: trimmed });
      setTemplates((prev) =>
        prev.map((t) => (t.id === template.id ? { ...t, name: trimmed } : t)),
      );
      toast.success("Template renamed");
    } catch {
      toast.error("Couldn't rename template");
    }
  }

  async function deleteTemplate(template: BlockTemplate) {
    try {
      await api.templates.remove(template.id);
      setTemplates((prev) => prev.filter((t) => t.id !== template.id));
      toast.success("Template deleted");
    } catch {
      toast.error("Couldn't delete template");
    }
  }

  function adjustHour(key: "dayStartHour" | "dayEndHour", delta: number) {
    const min = key === "dayStartHour" ? 0 : 1;
    const max = key === "dayStartHour" ? 23 : 24;
    const next = clamp(settings[key] + delta, min, max);
    if (key === "dayStartHour" && next >= settings.dayEndHour) return;
    if (key === "dayEndHour" && next <= settings.dayStartHour) return;
    patchSettings({ [key]: next });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 pb-28 pt-4">
      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <span className="text-sm">Theme</span>
          <ThemeToggle />
        </CardContent>
      </Card>

      {/* Domains */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Domains</CardTitle>
          <Button
            size="sm"
            variant="secondary"
            className="gap-1"
            onClick={() => {
              setEditingDomain(undefined);
              setDomainDialogOpen(true);
            }}
          >
            <Plus className="size-4" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {domains.length === 0 ? (
            <p className="py-2 text-center text-sm text-muted-foreground">
              No domains yet.
            </p>
          ) : (
            domains.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 rounded-lg bg-secondary/50 p-2.5"
              >
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${d.color}26`, color: d.color }}
                >
                  <Icon name={d.icon} className="size-4" />
                </div>
                <span className="flex-1 truncate text-sm font-medium">
                  {d.name}
                </span>
                <button
                  type="button"
                  aria-label={`Edit ${d.name}`}
                  onClick={() => {
                    setEditingDomain(d);
                    setDomainDialogOpen(true);
                  }}
                  className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-transform active:scale-90"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${d.name}`}
                  onClick={() => deleteDomain(d)}
                  className="flex size-8 items-center justify-center rounded-full text-destructive transition-transform active:scale-90"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Schedule hours */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <HourControl
            label="Day starts at"
            value={settings.dayStartHour}
            onDecrement={() => adjustHour("dayStartHour", -1)}
            onIncrement={() => adjustHour("dayStartHour", 1)}
          />
          <HourControl
            label="Day ends at"
            value={settings.dayEndHour}
            onDecrement={() => adjustHour("dayEndHour", -1)}
            onIncrement={() => adjustHour("dayEndHour", 1)}
          />
        </CardContent>
      </Card>

      {/* Water habit */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Droplet className="size-4 text-cyan-500" /> Water habit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-2 text-xs text-muted-foreground">
            The habit shown as the dashboard water ring.
          </p>
          <Select
            value={settings.waterHabitId ?? NONE}
            onValueChange={(v) =>
              patchSettings({ waterHabitId: v === NONE ? null : v })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Pick a habit" />
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
        </CardContent>
      </Card>

      {/* Japanese reviews habit */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="size-4 text-amber-500" /> Japanese reviews habit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-2 text-xs text-muted-foreground">
            The habit shown as the dashboard Japanese reviews hero (target is
            the habit&apos;s daily goal; +/− increments by 5).
          </p>
          <Select
            value={settings.japaneseHabitId ?? NONE}
            onValueChange={(v) =>
              patchSettings({ japaneseHabitId: v === NONE ? null : v })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Pick a habit" />
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
        </CardContent>
      </Card>

      {/* Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LayoutTemplate className="size-4" /> Schedule templates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {templates.length === 0 ? (
            <p className="py-2 text-center text-sm text-muted-foreground">
              No templates yet.
            </p>
          ) : (
            templates.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 rounded-lg bg-secondary/50 p-2"
              >
                <Input
                  defaultValue={t.name}
                  className="h-9 flex-1"
                  aria-label={`Template name`}
                  onBlur={(e) => renameTemplate(t, e.target.value)}
                />
                <span className="shrink-0 text-xs text-muted-foreground">
                  {t.blocks.length} blocks
                </span>
                <button
                  type="button"
                  aria-label={`Delete ${t.name}`}
                  onClick={() => deleteTemplate(t)}
                  className="flex size-8 shrink-0 items-center justify-center rounded-full text-destructive transition-transform active:scale-90"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <PushSettings />
        </CardContent>
      </Card>

      <DomainDialog
        open={domainDialogOpen}
        onOpenChange={setDomainDialogOpen}
        domain={editingDomain}
        onSaved={refreshDomains}
      />
    </div>
  );
}

function HourControl({
  label,
  value,
  onDecrement,
  onIncrement,
}: {
  label: string;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  const display = `${String(value % 24).padStart(2, "0")}:00`;
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={onDecrement}
          className="flex size-9 items-center justify-center rounded-full bg-secondary transition-transform active:scale-90"
        >
          <Minus className="size-4" />
        </button>
        <span className="w-14 text-center text-sm font-semibold tabular-nums">
          {display}
        </span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={onIncrement}
          className="flex size-9 items-center justify-center rounded-full bg-secondary transition-transform active:scale-90"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}
