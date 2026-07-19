import { ViewShell } from '@/components/view-shell';
import { WeekBoard } from '@/components/week-board';

export default function WeekPage() {
  return (
    <ViewShell
      eyebrow="Plan"
      title="Week"
      subtitle="Move scheduled work between days."
      compactHeader
      fullWidth
    >
      <WeekBoard />
    </ViewShell>
  );
}
