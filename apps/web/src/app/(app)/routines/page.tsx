import { ViewShell } from '@/components/view-shell';
import { RoutinesView } from '@/components/routines-view';

export default function RoutinesPage() {
  return (
    <ViewShell
      eyebrow="Build"
      title="Routines"
      subtitle="Track daily habits and streaks - morning, afternoon, evening, or anytime."
    >
      <RoutinesView />
    </ViewShell>
  );
}
