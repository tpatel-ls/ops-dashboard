import { ViewShell } from '@/components/view-shell';
import { TagsIndex } from '@/components/tags-index';

export default function TagsPage() {
  return (
    <ViewShell
      eyebrow="Workspace"
      title="Tags"
      subtitle="Free form labels parsed from quick add (#tag)."
    >
      <TagsIndex />
    </ViewShell>
  );
}
