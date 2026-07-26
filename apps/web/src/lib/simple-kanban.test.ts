import { describe, expect, it } from 'vitest';
import { simpleKanbanColumn, statusForSimpleKanbanColumn } from './simple-kanban';

describe('simpleKanbanColumn', () => {
  it.each([
    ['backlog', 'todo'],
    ['todo', 'todo'],
    ['blocked', 'todo'],
    ['doing', 'doing'],
    ['done', 'done'],
    ['archived', null],
  ] as const)('maps %s to %s', (status, column) => {
    expect(simpleKanbanColumn(status)).toBe(column);
  });
});

describe('statusForSimpleKanbanColumn', () => {
  it.each([
    ['todo', 'todo'],
    ['doing', 'doing'],
    ['done', 'done'],
  ] as const)('uses %s as the canonical drop status', (column, status) => {
    expect(statusForSimpleKanbanColumn(column)).toBe(status);
  });
});
