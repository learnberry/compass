import type { ReactNode } from "react";

import { BottomNav } from "@/components/layout/bottom-nav";
import { OnboardingSheet } from "@/components/onboarding/onboarding-sheet";

/**
 * Primary app shell — a centered phone-width column on the canvas, with the
 * fixed bottom navigation. Each screen renders its own header.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-canvas">
      {children}
      <BottomNav />
      <OnboardingSheet />
    </div>
  );
}
