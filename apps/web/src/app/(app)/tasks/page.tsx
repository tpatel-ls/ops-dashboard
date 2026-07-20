import { ViewShell } from '@/components/view-shell';
import { TasksView } from '@/components/tasks-view';

export default function TasksPage() {
  return (
    <ViewShell
      eyebrow="Plan"
      title="Tasks"
      subtitle="Capture, organize, and complete work across every organization."
      compactHeader
      fullWidth
    >
      <TasksView />
    </ViewShell>
  );
}
