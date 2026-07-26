import type { SimpleKanbanColumnId } from './simple-kanban';

const BOARD_ORDER: SimpleKanbanColumnId[] = ['todo', 'doing', 'done'];

export function previousBoardColumn(column: SimpleKanbanColumnId): SimpleKanbanColumnId | null {
  const index = BOARD_ORDER.indexOf(column);
  return index > 0 ? (BOARD_ORDER[index - 1] ?? null) : null;
}

export function nextBoardColumn(column: SimpleKanbanColumnId): SimpleKanbanColumnId | null {
  const index = BOARD_ORDER.indexOf(column);
  return index >= 0 && index < BOARD_ORDER.length - 1 ? (BOARD_ORDER[index + 1] ?? null) : null;
}
