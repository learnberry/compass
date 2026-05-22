import type { LucideIcon } from "lucide-react";
import { LineChart, Trophy, X } from "lucide-react";

import { SectionHeader } from "@/components/compass/section-header";
import { DomainTile } from "@/components/compass/domain-tile";
import { DOMAIN_PALETTE } from "@/lib/design";
import type { Highlight } from "@/components/features/review/review-metrics";

interface HighlightDef {
  icon: LucideIcon;
  /** Domain palette key — sources the tinted tile + icon color. */
  domain: keyof typeof DOMAIN_PALETTE;
  label: string;
  highlight: Highlight;
}

/**
 * The "Highlights" card — three rows (best streak, most consistent, missed
 * most), each a 36px tinted icon tile plus a label and value, 1px divider
 * between rows.
 */
export function HighlightsCard({
  bestStreak,
  mostConsistent,
  missedMost,
}: {
  bestStreak: Highlight;
  mostConsistent: Highlight;
  missedMost: Highlight;
}) {
  const rows: HighlightDef[] = [
    { icon: Trophy, domain: "learning", label: "Best streak", highlight: bestStreak },
    { icon: LineChart, domain: "career", label: "Most consistent", highlight: mostConsistent },
    { icon: X, domain: "relationships", label: "Missed most", highlight: missedMost },
  ];

  return (
    <section>
      <SectionHeader title="Highlights" />
      <div className="overflow-hidden rounded-card border border-hairline bg-surface">
        {rows.map((row, i) => (
          <div key={row.label}>
            {i > 0 && <div className="ml-[62px] h-px bg-divider" />}
            <HighlightRow {...row} />
          </div>
        ))}
      </div>
    </section>
  );
}

function HighlightRow({ icon, domain, label, highlight }: HighlightDef) {
  const visual = DOMAIN_PALETTE[domain];
  const value =
    highlight.name != null
      ? `${highlight.name} · ${highlight.detail}`
      : "No data yet";

  return (
    <div className="flex items-center gap-3 px-3.5 py-3">
      <DomainTile
        icon={icon}
        solid={visual.solid}
        tint={visual.tint}
        size={36}
        radius={11}
        iconSize={18}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-ink-2">{label}</p>
        <p className="mt-px truncate text-[13px] font-semibold text-ink">
          {value}
        </p>
      </div>
    </div>
  );
}
