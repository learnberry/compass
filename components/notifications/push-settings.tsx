"use client";

/**
 * `<PushSettings />` — the notification settings panel.
 *
 * Shows the current push permission state, lets the user enable / disable
 * web-push, sends a test push, and gives clear guidance for the cases where
 * push can't work yet: iOS requires the PWA to be installed to the Home Screen
 * first, and where push is unsupported or denied the in-app banner still
 * delivers reminders.
 */

import { useState } from "react";
import {
  Bell,
  BellRing,
  CheckCircle2,
  Info,
  Send,
  Share,
  Smartphone,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApiError } from "@/lib/api-client";
import { api } from "@/lib/api-client";
import { usePush } from "@/lib/notifications/use-push";
import { cn } from "@/lib/utils";

type BadgeTone = "success" | "warning" | "neutral";

/** A small inline status badge (no shared Badge primitive in this codebase). */
function StatusBadge({
  tone,
  children,
}: {
  tone: BadgeTone;
  children: React.ReactNode;
}): React.JSX.Element {
  const toneClass: Record<BadgeTone, string> = {
    success: "bg-primary/15 text-primary",
    warning: "bg-destructive/15 text-destructive",
    neutral: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        toneClass[tone],
      )}
    >
      {children}
    </span>
  );
}

export function PushSettings(): React.JSX.Element {
  const {
    permission,
    isSupported,
    isStandalone,
    isSubscribed,
    iosNeedsInstall,
    isBusy,
    subscribe,
    unsubscribe,
  } = usePush();
  const [testing, setTesting] = useState(false);

  const handleEnable = async (): Promise<void> => {
    const ok = await subscribe();
    if (ok) {
      toast.success("Notifications enabled");
    } else if (Notification.permission === "denied") {
      toast.error("Notifications are blocked in your browser settings");
    } else {
      toast.error("Couldn't enable notifications");
    }
  };

  const handleDisable = async (): Promise<void> => {
    const ok = await unsubscribe();
    if (ok) {
      toast.success("Notifications disabled");
    } else {
      toast.error("Couldn't disable notifications");
    }
  };

  const handleTest = async (): Promise<void> => {
    setTesting(true);
    try {
      const { sent } = await api.push.test();
      if (sent > 0) {
        toast.success(
          `Test push sent to ${sent} device${sent === 1 ? "" : "s"}`,
        );
      } else {
        toast.message("No devices are subscribed yet", {
          description: "Enable notifications on this device first.",
        });
      }
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Couldn't send test push";
      toast.error(message);
    } finally {
      setTesting(false);
    }
  };

  // ── Derive the headline status ──────────────────────────────────────────
  const denied = permission === "denied";
  const enabled = isSupported && permission === "granted" && isSubscribed;

  let badge: React.JSX.Element;
  if (!isSupported) {
    badge = <StatusBadge tone="neutral">Not supported</StatusBadge>;
  } else if (denied) {
    badge = <StatusBadge tone="warning">Blocked</StatusBadge>;
  } else if (enabled) {
    badge = <StatusBadge tone="success">Enabled</StatusBadge>;
  } else {
    badge = <StatusBadge tone="neutral">Off</StatusBadge>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <BellRing className="size-5 text-primary" />
            Push notifications
          </CardTitle>
          {badge}
        </div>
        <CardDescription>
          Get reminders for your habits and tasks even when Compass is closed.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* iOS install requirement — push only works once installed. */}
        {iosNeedsInstall ? (
          <div className="flex gap-3 rounded-lg border border-border bg-muted/50 p-3">
            <Share className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="text-sm">
              <p className="font-medium">Add Compass to your Home Screen first</p>
              <p className="mt-1 text-muted-foreground">
                On iPhone and iPad, push notifications only work for installed
                apps. Tap the <span className="font-medium">Share</span> button
                in Safari, then{" "}
                <span className="font-medium">Add to Home Screen</span>, and open
                Compass from there to enable notifications.
              </p>
            </div>
          </div>
        ) : null}

        {/* Unsupported browser — fall back to in-app banners. */}
        {!isSupported && !iosNeedsInstall ? (
          <div className="flex gap-3 rounded-lg border border-border bg-muted/50 p-3">
            <Info className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <div className="text-sm">
              <p className="font-medium">Push isn&apos;t available here</p>
              <p className="mt-1 text-muted-foreground">
                This browser doesn&apos;t support web push. Reminders will still
                appear as in-app banners whenever Compass is open.
              </p>
            </div>
          </div>
        ) : null}

        {/* Permission denied — explain how to recover, banners still work. */}
        {denied ? (
          <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div className="text-sm">
              <p className="font-medium">Notifications are blocked</p>
              <p className="mt-1 text-muted-foreground">
                You&apos;ve blocked notifications for Compass. Re-enable them in
                your browser or device settings to get push reminders. Until
                then, reminders still show as in-app banners while Compass is
                open.
              </p>
            </div>
          </div>
        ) : null}

        {/* Enabled confirmation. */}
        {enabled ? (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-3 text-sm">
            <CheckCircle2 className="size-5 shrink-0 text-primary" />
            <span className="text-muted-foreground">
              This device will receive push reminders.
            </span>
          </div>
        ) : null}

        {/* Standalone hint when installed but not yet subscribed. */}
        {isSupported && isStandalone && !enabled && !denied ? (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-3 text-sm">
            <Smartphone className="size-5 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">
              Compass is installed. Enable notifications to start receiving
              reminders.
            </span>
          </div>
        ) : null}

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          {enabled ? (
            <Button
              variant="outline"
              onClick={() => void handleDisable()}
              disabled={isBusy}
            >
              <Bell className="size-4" />
              Disable notifications
            </Button>
          ) : (
            <Button
              onClick={() => void handleEnable()}
              disabled={isBusy || !isSupported || denied || iosNeedsInstall}
            >
              <Bell className="size-4" />
              {isBusy ? "Enabling…" : "Enable notifications"}
            </Button>
          )}

          <Button
            variant="secondary"
            onClick={() => void handleTest()}
            disabled={testing || !enabled}
          >
            <Send className="size-4" />
            {testing ? "Sending…" : "Send test push"}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Reminders always appear as in-app banners while Compass is open — push
          notifications simply let them reach you when it&apos;s closed.
        </p>
      </CardContent>
    </Card>
  );
}
