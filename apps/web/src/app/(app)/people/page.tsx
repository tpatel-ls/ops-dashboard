import { ViewShell } from '@/components/view-shell';
import { PeopleView } from '@/components/people-view';

export default function PeoplePage() {
  return (
    <ViewShell
      eyebrow="Library"
      title="People"
      subtitle="Keep useful relationship context close to the work."
      compactHeader
      fullWidth
    >
      <PeopleView />
    </ViewShell>
  );
}
