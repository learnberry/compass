"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ColorPicker } from "@/components/features/shared/color-picker";
import { IconPicker } from "@/components/features/shared/icon-picker";
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
import type { Domain, DomainInput } from "@/lib/types";
import { api } from "@/lib/api-client";

interface DomainDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing domain to edit, or undefined to create. */
  domain?: Domain;
  onSaved: () => void;
}

/** Create / edit a life domain. */
export function DomainDialog({
  open,
  onOpenChange,
  domain,
  onSaved,
}: DomainDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [icon, setIcon] = useState("Sparkles");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (domain) {
      setName(domain.name);
      setColor(domain.color);
      setIcon(domain.icon || "Sparkles");
    } else {
      setName("");
      setColor("#6366f1");
      setIcon("Sparkles");
    }
  }, [open, domain]);

  async function handleSave() {
    if (name.trim() === "") {
      toast.error("Give the domain a name");
      return;
    }
    const payload: DomainInput = { name: name.trim(), color, icon };
    setSaving(true);
    try {
      if (domain) {
        await api.domains.update(domain.id, payload);
        toast.success("Domain updated");
      } else {
        await api.domains.create(payload);
        toast.success("Domain created");
      }
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("Couldn't save domain");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{domain ? "Edit domain" : "New domain"}</DialogTitle>
          <DialogDescription>
            Domains group habits, goals and time blocks.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="domain-name">Name</Label>
            <Input
              id="domain-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Health"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Color</Label>
            <ColorPicker value={color} onChange={setColor} />
          </div>
          <div className="space-y-1.5">
            <Label>Icon</Label>
            <IconPicker value={icon} onChange={setIcon} color={color} />
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
            {saving ? "Saving…" : domain ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
