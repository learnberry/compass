import { DomainTile } from "@/components/compass/domain-tile";
import { formatClock12 } from "@/lib/dates";
import type { Domain, Habit, Reminder } from "@/lib/types";
import { reminderClock, reminderVisual } from "./reminder-visual";

interface UpcomingListProps {
  reminders: Reminder[];
  habitsById: Map<string, Habit>;
  domainsById: Map<string, Domain>;
}

/** A single reminder row inside the "Upcoming today" card. */
function UpcomingRow({
  reminder,
  habitsById,
  domainsById,
}: {
  reminder: Reminder;
  habitsById: Map<string, Habit>;
  domainsById: Map<string, Domain>;
}) {
  const { domain, icon } = reminderVisual(reminder, habitsById, domainsById);

  return (
    <div className="flex items-center gap-3 px-3.5 py-3">
      <DomainTile
        icon={icon}
        solid={domain.solid}
        tint={domain.tint}
        size={36}
        radius={11}
        iconSize={18}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-ink">
          {reminder.title}
        </p>
        {reminder.body ? (
          <p className="mt-px truncate text-[11px] text-ink-2">{reminder.body}</p>
        ) : null}
      </div>
      <span className="shrink-0 text-xs font-semibold text-ink-2 tnum">
        {formatClock12(reminderClock(reminder.scheduledTime))}
      </span>
    </div>
  );
}

/** The "Upcoming today" card — a white list of reminder rows with inset dividers. */
export function UpcomingList({
  reminders,
  habitsById,
  domainsById,
}: UpcomingListProps) {
  if (reminders.length === 0) {
    return (
      <div className="rounded-card border border-hairline bg-surface px-4 py-6 text-center">
        <p className="text-[13px] font-medium text-ink-2">
          Nothing else scheduled today.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-card border border-hairline bg-surface">
      {reminders.map((reminder, i) => (
        <div key={reminder.id}>
          {i > 0 ? <div className="ml-[62px] h-px bg-divider" /> : null}
          <UpcomingRow
            reminder={reminder}
            habitsById={habitsById}
            domainsById={domainsById}
          />
        </div>
      ))}
    </div>
  );
}
