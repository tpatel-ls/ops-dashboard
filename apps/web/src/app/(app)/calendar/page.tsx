import { ViewShell } from '@/components/view-shell';
import { CalendarWeek } from '@/components/calendar-week';

export default function CalendarPage() {
  return (
    <ViewShell
      eyebrow="Plan"
      title="Calendar"
      subtitle="See scheduled work across every organization in one weekly view."
      compactHeader
      fullWidth
    >
      <CalendarWeek />
    </ViewShell>
  );
}
