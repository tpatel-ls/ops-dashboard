import { ViewShell } from '@/components/view-shell';
import { ContentBoard } from '@/components/content-board';

export default function ContentPage() {
  return (
    <ViewShell
      eyebrow="Build"
      title="Content"
      subtitle="Move videos, articles, podcasts, and newsletters through your pipeline — idea to published."
    >
      <ContentBoard />
    </ViewShell>
  );
}
