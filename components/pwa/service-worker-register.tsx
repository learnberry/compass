"use client";

import { useEffect } from "react";

/**
 * Minimal subset of the experimental Periodic Background Sync API.
 * Not in the TS DOM lib, so we describe only what we use.
 */
interface PeriodicSyncManager {
  register: (tag: string, options?: { minInterval: number }) => Promise<void>;
}

interface PeriodicSyncRegistration extends ServiceWorkerRegistration {
  periodicSync?: PeriodicSyncManager;
}

/** One day, in milliseconds — the requested periodic sync cadence floor. */
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Registers the Compass service worker on mount. Best-effort: failures are
 * logged, never thrown. Also attempts to register periodic background sync
 * for reminder dispatch when the browser supports it and permission allows.
 *
 * Renders nothing.
 */
export function ServiceWorkerRegister(): null {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    const register = async (): Promise<void> => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        if (cancelled) return;

        // Gentle update handling: when a new worker takes control, reload once
        // so the user sees the fresh app shell.
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (
              installing.state === "activated" &&
              navigator.serviceWorker.controller
            ) {
              // A previous worker existed and a new one just activated.
              window.location.reload();
            }
          });
        });

        await registerPeriodicSync(registration);
      } catch (err) {
        console.warn("[pwa] service worker registration failed", err);
      }
    };

    const registerPeriodicSync = async (
      registration: ServiceWorkerRegistration,
    ): Promise<void> => {
      const periodic = registration as PeriodicSyncRegistration;
      if (!periodic.periodicSync) return;
      try {
        const status = await navigator.permissions.query({
          // periodic-background-sync is not in the standard PermissionName union.
          name: "periodic-background-sync" as PermissionName,
        });
        if (status.state !== "granted") return;
        await periodic.periodicSync.register("compass-reminders", {
          minInterval: ONE_DAY_MS,
        });
      } catch {
        // Unsupported permission name or registration failure — ignore.
      }
    };

    void register();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
