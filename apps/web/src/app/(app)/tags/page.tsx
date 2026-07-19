import { ViewShell } from '@/components/view-shell';
import { TagsIndex } from '@/components/tags-index';

export default function TagsPage() {
  return (
    <ViewShell
      eyebrow="Workspace"
      title="Tags"
      subtitle="Filter tagged work across every organization."
      compactHeader
      fullWidth
    >
      <TagsIndex />
    </ViewShell>
  );
}
