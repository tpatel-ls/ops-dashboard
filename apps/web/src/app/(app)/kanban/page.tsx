import { ViewShell } from '@/components/view-shell';
import { KanbanBoard } from '@/components/kanban-board';

export default function KanbanPage() {
  return (
    <ViewShell
      eyebrow="Work"
      title="Kanban"
      subtitle="Group by status, project, priority, or tag. Drag to update."
    >
      <KanbanBoard />
    </ViewShell>
  );
}
