import { ViewShell } from '@/components/view-shell';
import { TaskList } from '@/components/task-list';

export default function InboxPage() {
  return (
    <ViewShell
      eyebrow="Capture"
      title="Inbox"
      subtitle="Unscheduled tasks waiting for a time and place."
    >
      <TaskList filter="inbox" />
    </ViewShell>
  );
}
