import { ViewShell } from '@/components/view-shell';
import { KanbanBoard } from '@/components/kanban-board';

export default function KanbanPage() {
  return (
    <ViewShell
      eyebrow="Tasks"
      title="Board"
      subtitle="Move work from to do, to in progress, to done."
      compactHeader
      fullWidth
    >
      <KanbanBoard />
    </ViewShell>
  );
}
