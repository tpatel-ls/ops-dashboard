import { ViewShell } from '@/components/view-shell';
import { TasksView } from '@/components/tasks-view';

export const metadata = { title: 'Tasks · Taskify' };

export default function TasksPage() {
  return (
    <ViewShell
      eyebrow="Tasks"
      title="All tasks"
      subtitle="Find, finish, or update a task."
      compactHeader
      fullWidth
    >
      <TasksView />
    </ViewShell>
  );
}
