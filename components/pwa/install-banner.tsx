"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

/** localStorage key remembering that the user dismissed the banner. */
const DISMISS_KEY = "compass.install-dismissed";

/**
 * The `beforeinstallprompt` event — not in the standard TS DOM lib.
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  prompt: () => Promise<void>;
}

/** Safari exposes a non-standard `navigator.standalone` boolean on iOS. */
interface SafariNavigator extends Navigator {
  standalone?: boolean;
}

type Mode = "hidden" | "ios" | "prompt";

/** True when the app is already running as an installed standalone PWA. */
function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const displayStandalone = window.matchMedia(
    "(display-mode: standalone)",
  ).matches;
  const iosStandalone = (navigator as SafariNavigator).standalone === true;
  return displayStandalone || iosStandalone;
}

/** Heuristic: iOS Safari (not Chrome/Firefox-on-iOS, which can't install). */
function isIosSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isWebkit = /^((?!crios|fxios|edgios).)*safari/i.test(ua);
  return isIos && isWebkit;
}

/** Small inline iOS Share glyph (square with an up arrow). */
function ShareGlyph(): React.JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 15V3" />
      <path d="m8 7 4-4 4 4" />
      <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}

/**
 * Bottom install banner.
 *
 * - iOS Safari (not standalone): instructions to Add to Home Screen.
 * - Other browsers: captures `beforeinstallprompt` and offers an Install button.
 *
 * Dismissal is persisted so the banner does not nag.
 */
export function InstallBanner(): React.JSX.Element | null {
  const [mode, setMode] = useState<Mode>("hidden");
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already installed, or previously dismissed — stay hidden.
    if (isStandalone()) return;
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      // localStorage may be unavailable (private mode) — proceed anyway.
    }

    const onBeforeInstallPrompt = (event: Event): void => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setMode("prompt");
    };

    const onInstalled = (): void => {
      setMode("hidden");
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // iOS has no install prompt — show the manual instructions instead.
    if (isIosSafari()) {
      setMode("ios");
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = (): void => {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Ignore storage failures.
    }
    setMode("hidden");
  };

  const install = async (): Promise<void> => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } catch {
      // User dismissed or prompt unavailable.
    } finally {
      setDeferredPrompt(null);
      setMode("hidden");
    }
  };

  if (mode === "hidden") return null;

  return (
    <div
      role="region"
      aria-label="Install Compass"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "14px 16px",
        paddingBottom: "calc(14px + env(safe-area-inset-bottom))",
        background: "#15151c",
        borderTop: "1px solid #2a2a35",
        color: "#e5e5ea",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          flexShrink: 0,
          width: "40px",
          height: "40px",
          borderRadius: "10px",
          background: "#6366f1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="24" height="24" viewBox="0 0 1024 1024" aria-hidden="true">
          <circle
            cx="512"
            cy="512"
            r="288"
            fill="none"
            stroke="#ffffff"
            strokeWidth="44"
            strokeOpacity="0.55"
          />
          <path d="M512 232 L584 512 L512 480 Z" fill="#ffffff" />
          <path
            d="M512 792 L440 512 L512 544 Z"
            fill="#ffffff"
            fillOpacity="0.55"
          />
          <path
            d="M792 512 L512 584 L544 512 Z"
            fill="#ffffff"
            fillOpacity="0.8"
          />
          <path
            d="M232 512 L512 440 L480 512 Z"
            fill="#ffffff"
            fillOpacity="0.8"
          />
          <circle cx="512" cy="512" r="40" fill="#ffffff" />
        </svg>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>
          Install Compass
        </p>
        {mode === "ios" ? (
          <p
            style={{
              margin: "2px 0 0",
              fontSize: "13px",
              lineHeight: 1.4,
              color: "#9999a3",
            }}
          >
            Add Compass to your Home Screen — tap the Share button{" "}
            <span
              style={{
                display: "inline-flex",
                verticalAlign: "-4px",
                color: "#6366f1",
              }}
            >
              <ShareGlyph />
            </span>{" "}
            , then &lsquo;Add to Home Screen&rsquo;.
          </p>
        ) : (
          <p
            style={{
              margin: "2px 0 0",
              fontSize: "13px",
              lineHeight: 1.4,
              color: "#9999a3",
            }}
          >
            Get the full-screen app with reminders on your Home Screen.
          </p>
        )}
      </div>

      <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
        {mode === "prompt" ? (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              void install();
            }}
          >
            Install app
          </Button>
        ) : null}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Dismiss"
          onClick={dismiss}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
