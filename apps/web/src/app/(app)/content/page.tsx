import { ViewShell } from '@/components/view-shell';
import { ContentBoard } from '@/components/content-board';

export const metadata = { title: 'Content · Taskify' };

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
