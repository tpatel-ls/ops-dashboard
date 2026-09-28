import type { Announcements } from '@dnd-kit/core';

// dnd-kit's default announcements read the raw draggable and droppable ids
// aloud, which on these boards are record UUIDs and ISO dates. Each board
// passes a readable `label` in its useDraggable and useDroppable `data`.
interface Labelled {
  data: { current?: Record<string, unknown> };
}

function labelOf(node: Labelled | null, fallback: string): string {
  const label = node?.data.current?.label;
  return typeof label === 'string' && label.trim() ? label : fallback;
}

export const DRAG_ANNOUNCEMENTS: Announcements = {
  onDragStart: ({ active }) => `Picked up ${labelOf(active, 'task')}.`,
  onDragOver: ({ active, over }) =>
    over
      ? `${labelOf(active, 'Task')} is over ${labelOf(over, 'a drop area')}.`
      : `${labelOf(active, 'Task')} is no longer over a drop area.`,
  onDragEnd: ({ active, over }) =>
    over
      ? `${labelOf(active, 'Task')} was dropped on ${labelOf(over, 'a drop area')}.`
      : `${labelOf(active, 'Task')} was dropped outside any drop area and did not move.`,
  onDragCancel: ({ active }) => `Moving ${labelOf(active, 'task')} was cancelled.`,
};
