import { ViewShell } from '@/components/view-shell';
import { WhiteboardEditor } from '@/components/whiteboard-editor';

export default async function WhiteboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <ViewShell eyebrow="Canvas" title="Whiteboard" subtitle="Pen pressure, tilt, palm rejection.">
      <WhiteboardEditor id={id} />
    </ViewShell>
  );
}
