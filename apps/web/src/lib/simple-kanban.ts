import type { TaskStatus } from '@ops-dashboard/core';

export type SimpleKanbanColumnId = 'todo' | 'doing' | 'done';

export interface SimpleKanbanColumn {
  id: SimpleKanbanColumnId;
  label: string;
  color: string;
}

export const SIMPLE_KANBAN_COLUMNS: SimpleKanbanColumn[] = [
  { id: 'todo', label: 'To do', color: 'var(--color-primary)' },
  { id: 'doing', label: 'In progress', color: 'var(--color-warning)' },
  { id: 'done', label: 'Done', color: 'var(--color-success)' },
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
