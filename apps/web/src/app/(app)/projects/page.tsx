import { ViewShell } from '@/components/view-shell';
import { ProjectsBoard } from '@/components/projects-board';

export default function ProjectsPage() {
  return (
    <ViewShell
      eyebrow="Build"
      title="Projects"
      subtitle="Projects, areas, and retainers — click any card to open the detail panel."
    >
      <ProjectsBoard />
    </ViewShell>
  );
}
