import { ViewShell } from '@/components/view-shell';
import { TasksView } from '@/components/tasks-view';

export default function TasksPage() {
  return (
    <ViewShell
      eyebrow="Plan"
      title="Tasks"
      subtitle="Everything you need to do, sorted by when it's due."
    >
      <TasksView />
    </ViewShell>
  );
}
