"use client";

import { useEffect, useState } from "react";
import { Check, Compass, Share, SquarePlus, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** localStorage keys — see the handoff "Interactions & behavior" table. */
const ONBOARDED_KEY = "compass_onboarded";
const DISMISSED_AT_KEY = "compass_onboarded_dismissed_at";
/** Re-prompt window after a "Maybe later" dismissal. */
const REPROMPT_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Decide whether the install sheet should appear on this visit.
 *
 * Shows unless the user has already installed (`compass_onboarded === "1"`) or
 * dismissed it less than 7 days ago.
 */
function shouldShow(): boolean {
  try {
    if (window.localStorage.getItem(ONBOARDED_KEY) === "1") return false;
    const dismissedAt = window.localStorage.getItem(DISMISSED_AT_KEY);
    if (dismissedAt) {
      const ts = Number(dismissedAt);
      if (Number.isFinite(ts) && Date.now() - ts < REPROMPT_AFTER_MS) {
        return false;
      }
    }
    return true;
  } catch {
    // localStorage unavailable (private mode) — don't nag.
    return false;
  }
}

interface StepProps {
  n: number;
  icon: LucideIcon;
  /** Tile background tint. */
  tint: string;
  /** Icon colour. */
  solid: string;
  title: string;
  sub: string;
}

/** A single numbered instruction row inside the install sheet. */
function Step({ n, icon: Icon, tint, solid, title, sub }: StepProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-divider text-[11px] font-bold text-ink tnum">
        {n}
      </span>
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-tile"
        style={{ background: tint }}
      >
        <Icon className="size-5" strokeWidth={1.75} style={{ color: solid }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold tracking-[-0.1px] text-ink">
          {title}
        </p>
        <p className="mt-px text-[11px] text-ink-2">{sub}</p>
      </div>
    </div>
  );
}

/**
 * `<OnboardingSheet>` — the iOS "Add to Home Screen" install sheet.
 *
 * Mounted globally by the app layout. On mount it decides (via localStorage)
 * whether to surface; otherwise it renders nothing. A bottom sheet over a
 * dimmed backdrop walks the user through the three-step install flow.
 */
export function OnboardingSheet() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (shouldShow()) setOpen(true);
  }, []);

  if (!open) return null;

  /** "Got it" — mark installed and close. */
  const handleGotIt = () => {
    try {
      window.localStorage.setItem(ONBOARDED_KEY, "1");
    } catch {
      /* ignore storage failures */
    }
    setOpen(false);
  };

  /** "Maybe later" (and backdrop tap) — record dismissal, re-prompt in 7 days. */
  const handleMaybeLater = () => {
    try {
      window.localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()));
    } catch {
      /* ignore storage failures */
    }
    setOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Install Compass"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={handleMaybeLater}
        className="absolute inset-0 animate-in fade-in-0 duration-200"
        style={{ background: "rgba(32,33,36,0.55)" }}
      />

      {/* Sheet */}
      <div
        className={cn(
          "relative w-full max-w-md bg-surface pb-safe",
          "animate-in slide-in-from-bottom duration-300 ease-out",
        )}
        style={{
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          boxShadow: "0 -10px 40px rgba(0,0,0,0.18)",
        }}
      >
        <div className="px-[22px] pb-[22px] pt-6">
          {/* Drag handle */}
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-ink-4" />

          {/* Logo block */}
          <div className="flex flex-col items-center">
            <div
              className="flex size-16 items-center justify-center bg-career"
              style={{
                borderRadius: 16,
                boxShadow: "0 8px 20px rgba(66,133,244,0.3)",
              }}
            >
              <Compass className="size-9 text-white" strokeWidth={2} />
            </div>
            <h2 className="mt-3 text-[20px] font-bold tracking-[-0.3px] text-ink">
              Install Compass
            </h2>
            <p className="mt-1 max-w-[260px] text-center text-[13px] leading-[1.4] text-ink-2">
              Add to your Home Screen to get reminders and open in one tap
            </p>
          </div>

          {/* Steps */}
          <div className="mb-[18px] mt-4 flex flex-col gap-2.5">
            <Step
              n={1}
              icon={Share}
              tint="#E8F0FE"
              solid="#4285F4"
              title="Tap the Share button"
              sub="At the bottom of Safari"
            />
            <Step
              n={2}
              icon={SquarePlus}
              tint="#E8F0FE"
              solid="#4285F4"
              title="Choose &lsquo;Add to Home Screen&rsquo;"
              sub="Scroll down in the share sheet"
            />
            <Step
              n={3}
              icon={Check}
              tint="#E6F4EA"
              solid="#34A853"
              title="Tap &lsquo;Add&rsquo;"
              sub="Compass is on your Home Screen"
            />
          </div>

          {/* Primary CTA */}
          <button
            type="button"
            onClick={handleGotIt}
            className="w-full rounded-btn bg-career px-4 py-3.5 text-[15px] font-semibold text-white transition-transform active:scale-[0.98]"
            style={{ boxShadow: "0 2px 6px rgba(66,133,244,0.3)" }}
          >
            Got it
          </button>

          {/* Secondary CTA */}
          <button
            type="button"
            onClick={handleMaybeLater}
            className="mt-1 w-full bg-transparent px-4 py-2.5 text-[13px] font-medium text-ink-2"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
