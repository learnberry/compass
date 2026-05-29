import { Skeleton } from "@/components/ui/skeleton";

/**
 * Instant fallback shown on tab navigation while a screen's server component
 * fetches its data — so switching tabs feels immediate instead of frozen.
 * Generic header + card stack that loosely matches every screen's layout.
 */
export default function Loading() {
  return (
    <div className="pt-safe">
      <div className="px-5 pb-[96px] pt-2">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-7 w-44" />
          </div>
          <Skeleton className="size-11 rounded-full" />
        </div>

        {/* Metric row */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          <Skeleton className="h-[68px] rounded-card" />
          <Skeleton className="h-[68px] rounded-card" />
          <Skeleton className="h-[68px] rounded-card" />
        </div>

        {/* Content cards */}
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-card" />
          <Skeleton className="h-16 rounded-card" />
          <Skeleton className="h-16 rounded-card" />
          <Skeleton className="h-40 rounded-card" />
        </div>
      </div>
    </div>
  );
}
