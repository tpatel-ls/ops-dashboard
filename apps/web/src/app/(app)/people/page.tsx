import { ViewShell } from '@/components/view-shell';
import { PeopleView } from '@/components/people-view';

export default function PeoplePage() {
  return (
    <ViewShell
      eyebrow="Library"
      title="People"
      subtitle="Remember what matters — facts, interactions, and context about the people in your life."
    >
      <PeopleView />
    </ViewShell>
  );
}
