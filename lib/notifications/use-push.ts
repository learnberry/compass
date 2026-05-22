"use client";

/**
 * `usePush` — the client hook that owns the browser's web-push lifecycle.
 *
 * It reports whether push is supported / permitted / active, and exposes
 * subscribe / unsubscribe actions. iOS is a special case: Safari only allows
 * web-push for PWAs that have been added to the Home Screen (iOS 16.4+), so the
 * hook surfaces `iosNeedsInstall` to drive an install hint instead of failing.
 */

import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api-client";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/** Decode a URL-safe base64 VAPID key into the Uint8Array `pushManager` wants. */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  // Back the array with a plain ArrayBuffer so it satisfies `BufferSource`.
  const buffer = new ArrayBuffer(rawData.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i += 1) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

/** Whether the runtime exposes the APIs web-push needs. */
function detectSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Whether the app is currently running as an installed standalone PWA. */
function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const displayModeStandalone = window.matchMedia("(display-mode: standalone)").matches;
  // iOS Safari exposes a non-standard `navigator.standalone` flag.
  const iosStandalone =
    "standalone" in window.navigator &&
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return displayModeStandalone || iosStandalone;
}

/** Rough iOS / iPadOS detection (iPadOS reports as Mac, so also check touch). */
function detectIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIphoneIpod = /iPad|iPhone|iPod/.test(ua);
  const isIpadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return isIphoneIpod || isIpadOs;
}

export interface UsePushResult {
  /** Current Notification permission. "default" until the user is asked. */
  permission: NotificationPermission;
  /** Whether the browser supports web-push at all. */
  isSupported: boolean;
  /** Whether the app is running as an installed standalone PWA. */
  isStandalone: boolean;
  /** Whether there is an active push subscription registered. */
  isSubscribed: boolean;
  /** True on iOS when the app is not yet installed to the Home Screen. */
  iosNeedsInstall: boolean;
  /** True while a subscribe/unsubscribe action is in flight. */
  isBusy: boolean;
  /** Request permission and register a push subscription. Resolves to success. */
  subscribe: () => Promise<boolean>;
  /** Tear down the active push subscription. Resolves to success. */
  unsubscribe: () => Promise<boolean>;
}

export function usePush(): UsePushResult {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  // Establish environment + current subscription state on mount.
  useEffect(() => {
    const supported = detectSupported();
    setIsSupported(supported);
    setIsStandalone(detectStandalone());
    setIsIos(detectIos());
    if (supported) {
      setPermission(Notification.permission);
    }

    if (!supported) return;

    let cancelled = false;
    void navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        if (!cancelled) setIsSubscribed(subscription !== null);
      })
      .catch(() => {
        if (!cancelled) setIsSubscribed(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!detectSupported()) {
      console.warn("[use-push] web-push is not supported in this browser");
      return false;
    }
    if (!VAPID_PUBLIC_KEY) {
      console.warn("[use-push] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set — cannot subscribe");
      return false;
    }

    setIsBusy(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") {
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      // Reuse an existing subscription if one is already present.
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }));

      await api.push.subscribe(subscription.toJSON(), navigator.userAgent);
      setIsSubscribed(true);
      return true;
    } catch (error) {
      console.error("[use-push] failed to subscribe:", error);
      return false;
    } finally {
      setIsBusy(false);
    }
  }, []);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!detectSupported()) return false;

    setIsBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const { endpoint } = subscription;
        await subscription.unsubscribe();
        await api.push.unsubscribe(endpoint);
      }
      setIsSubscribed(false);
      return true;
    } catch (error) {
      console.error("[use-push] failed to unsubscribe:", error);
      return false;
    } finally {
      setIsBusy(false);
    }
  }, []);

  return {
    permission,
    isSupported,
    isStandalone,
    isSubscribed,
    iosNeedsInstall: isIos && !isStandalone,
    isBusy,
    subscribe,
    unsubscribe,
  };
}
