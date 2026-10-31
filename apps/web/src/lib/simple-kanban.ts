import type { TaskStatus } from '@ops-dashboard/core';

export type SimpleKanbanColumnId = 'todo' | 'doing' | 'done';

export interface SimpleKanbanColumn {
  id: SimpleKanbanColumnId;
  label: string;
  description: string;
  color: string;
}

export const SIMPLE_KANBAN_COLUMNS: SimpleKanbanColumn[] = [
  {
    id: 'todo',
    label: 'To do',
    description: 'Ready to start',
    color: 'var(--color-primary)',
  },
  {
    id: 'doing',
    label: 'In progress',
    description: 'Currently moving',
    color: 'var(--color-warning)',
  },
  { id: 'done', label: 'Done', description: 'Finished', color: 'var(--color-success)' },
];

export function simpleKanbanColumn(status: TaskStatus): SimpleKanbanColumnId | null {
  if (status === 'archived') return null;
  if (status === 'doing') return 'doing';
  if (status === 'done') return 'done';
  return 'todo';
}

export function statusForSimpleKanbanColumn(column: SimpleKanbanColumnId): TaskStatus {
  return column;
}

/**
 * The status a task should take when dropped on `column`, or null when the
 * task already sits in that column. Backlog and blocked tasks share the To do
 * column, so treating a same-column drop as a move would quietly rewrite them
 * to `todo` and lose the blocked marker.
 */
export function statusForKanbanDrop(
  current: TaskStatus,
  column: SimpleKanbanColumnId,
): TaskStatus | null {
  if (simpleKanbanColumn(current) === column) return null;
  return statusForSimpleKanbanColumn(column);
}
