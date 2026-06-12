import { ViewShell } from '@/components/view-shell';
import { WhiteboardList } from '@/components/whiteboard-list';

export default function WhiteboardsPage() {
  return (
    <ViewShell
      eyebrow="Work"
      title="Whiteboards"
      subtitle="Infinite canvas with first-class S-Pen, palm rejection, and autosave."
    >
      <WhiteboardList />
    </ViewShell>
  );
}
