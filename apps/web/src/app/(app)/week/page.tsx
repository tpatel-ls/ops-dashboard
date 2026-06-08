import { ViewShell } from '@/components/view-shell';
import { WeekBoard } from '@/components/week-board';

export default function WeekPage() {
  return (
    <ViewShell eyebrow="Plan" title="Week" subtitle="Drag cards between days to reschedule.">
      <WeekBoard />
    </ViewShell>
  );
}
