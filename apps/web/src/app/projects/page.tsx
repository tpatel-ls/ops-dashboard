import { ViewShell } from '@/components/view-shell';
import { ProjectsManager } from '@/components/projects-manager';

export default function ProjectsPage() {
  return (
    <ViewShell
      eyebrow="Workspace"
      title="Projects"
      subtitle="Color groups that wire into Kanban grouping and task rows."
    >
      <ProjectsManager />
    </ViewShell>
  );
}
