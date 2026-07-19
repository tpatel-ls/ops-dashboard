import { ViewShell } from '@/components/view-shell';
import { WhiteboardList } from '@/components/whiteboard-list';

export default function WhiteboardsPage() {
  return (
    <ViewShell
      eyebrow="Work"
      title="Whiteboards"
      subtitle="Open a board or create a new planning canvas."
      compactHeader
      fullWidth
    >
      <WhiteboardList />
    </ViewShell>
  );
}
