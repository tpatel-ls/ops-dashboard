import { ViewShell } from '@/components/view-shell';
import { ProjectsBoard } from '@/components/projects-board';

export default function ProjectsPage() {
  return (
    <ViewShell
      eyebrow="Build"
      title="Projects"
      subtitle="Plan outcomes and keep their next tasks moving."
    >
      <ProjectsBoard />
    </ViewShell>
  );
}
