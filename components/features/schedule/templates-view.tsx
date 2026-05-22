"use client";

import { useState } from "react";
import { LayoutTemplate, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { BlockTemplate } from "@/lib/types";
import { api } from "@/lib/api-client";
import { haptic } from "@/lib/utils";

interface TemplatesViewProps {
  templates: BlockTemplate[];
  /** The date templates apply to. */
  date: string;
  /** Called after a template is applied to the day. */
  onApplied: () => void;
  /** Called after a template is deleted. */
  onDeleted: (id: string) => void;
}

/** Templates tab — apply a saved block set to the day, or delete it. */
export function TemplatesView({
  templates,
  date,
  onApplied,
  onDeleted,
}: TemplatesViewProps) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function apply(template: BlockTemplate) {
    haptic(12);
    setBusyId(template.id);
    try {
      await api.timeBlocks.applyTemplate(template.id, date);
      toast.success(`Applied "${template.name}"`);
      onApplied();
    } catch {
      toast.error("Couldn't apply template");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(template: BlockTemplate) {
    haptic(12);
    setBusyId(template.id);
    try {
      await api.templates.remove(template.id);
      toast.success("Template deleted");
      onDeleted(template.id);
    } catch {
      toast.error("Couldn't delete template");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 pb-6">
      {templates.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-hairline py-16 text-center">
          <LayoutTemplate className="size-7 text-ink-3" strokeWidth={1.75} />
          <p className="max-w-[220px] text-[13px] font-medium text-ink-2">
            No templates yet. Save a day&apos;s blocks as a template to reuse
            them.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {templates.map((t) => {
            const busy = busyId === t.id;
            const swatches = t.blocks.slice(0, 6);
            return (
              <div
                key={t.id}
                className="rounded-card border border-hairline bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold tracking-[-0.2px] text-ink">
                      {t.name}
                    </p>
                    <p className="mt-0.5 text-[12px] font-medium text-ink-2">
                      {t.blocks.length} block
                      {t.blocks.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Delete ${t.name}`}
                    onClick={() => remove(t)}
                    disabled={busy}
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors active:bg-divider disabled:opacity-50"
                  >
                    <Trash2 className="size-4" strokeWidth={1.75} />
                  </button>
                </div>

                {swatches.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {swatches.map((b, i) => (
                      <span
                        key={i}
                        className="h-1.5 flex-1 rounded-full"
                        style={{ background: b.color, minWidth: 20 }}
                      />
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => apply(t)}
                  disabled={busy}
                  className="mt-3 w-full rounded-btn bg-career-tint py-2.5 text-[13px] font-semibold text-career transition-colors active:bg-career-tint/70 disabled:opacity-50"
                >
                  {busy ? "Applying…" : "Apply to this day"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
