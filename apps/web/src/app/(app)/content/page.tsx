import { ViewShell } from '@/components/view-shell';
import { ContentBoard } from '@/components/content-board';

export default function ContentPage() {
  return (
    <ViewShell
      eyebrow="Build"
      title="Content"
      subtitle="Track every deliverable from idea to published."
      compactHeader
      fullWidth
    >
      <ContentBoard />
    </ViewShell>
  );
}
