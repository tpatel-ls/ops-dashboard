import { ViewShell } from '@/components/view-shell';
import { CalendarWeek } from '@/components/calendar-week';

export default function CalendarPage() {
  return (
    <ViewShell
      eyebrow="Plan"
      title="Calendar"
      subtitle="Time blocks render from startAt and endAt. Click a block to edit."
    >
      <CalendarWeek />
    </ViewShell>
  );
}
