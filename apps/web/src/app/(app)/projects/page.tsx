import { ViewShell } from '@/components/view-shell';
import { ProjectsBoard } from '@/components/projects-board';

export default function ProjectsPage() {
  return (
    <ViewShell
      eyebrow="Tasks"
      title="Projects"
      subtitle="Group related tasks around an outcome."
      compactHeader
      fullWidth
    >
      <ProjectsBoard />
    </ViewShell>
  );
}
