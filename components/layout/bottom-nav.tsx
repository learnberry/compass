"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Calendar,
  CircleCheck,
  HeartPulse,
  Home,
  type LucideIcon,
  Target,
} from "lucide-react";

import { cn, haptic } from "@/lib/utils";

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/habits", label: "Habits", icon: CircleCheck },
  { href: "/schedule", label: "Schedule", icon: Calendar },
  { href: "/health", label: "Health", icon: HeartPulse },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/review", label: "Review", icon: BarChart3 },
];

/** Fixed 5-tab bottom navigation. Active tab gets a Career-blue pill. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-hairline bg-surface"
      style={{ padding: "8px 8px calc(env(safe-area-inset-bottom) + 10px)" }}
    >
      <ul className="flex items-start justify-around">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={() => haptic(8)}
                aria-current={active ? "page" : undefined}
                className="flex min-w-[56px] flex-col items-center gap-1 px-0.5 py-1"
              >
                <span
                  className={cn(
                    "flex items-center justify-center rounded-2xl px-3.5 py-1 transition-colors",
                    active ? "bg-career-tint" : "bg-transparent",
                  )}
                >
                  <Icon
                    className={cn("size-[22px]", active ? "text-career" : "text-ink-2")}
                    strokeWidth={active ? 2.2 : 1.75}
                  />
                </span>
                <span
                  className={cn(
                    "text-[11px] tracking-[0.1px]",
                    active ? "font-semibold text-career" : "font-medium text-ink-2",
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
