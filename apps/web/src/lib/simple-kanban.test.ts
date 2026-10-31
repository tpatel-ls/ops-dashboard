import { describe, expect, it } from 'vitest';
import {
  SIMPLE_KANBAN_COLUMNS,
  simpleKanbanColumn,
  statusForKanbanDrop,
  statusForSimpleKanbanColumn,
} from './simple-kanban';

it('gives every lane a concise purpose', () => {
  expect(SIMPLE_KANBAN_COLUMNS.map(({ id, description }) => [id, description])).toEqual([
    ['todo', 'Ready to start'],
    ['doing', 'Currently moving'],
    ['done', 'Finished'],
  ]);
});

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

describe('statusForKanbanDrop', () => {
  it.each(['backlog', 'todo', 'blocked'] as const)(
    'keeps a %s task unchanged when it is dropped back on To do',
    (status) => {
      expect(statusForKanbanDrop(status, 'todo')).toBeNull();
    },
  );

  it.each([
    ['blocked', 'doing', 'doing'],
    ['backlog', 'done', 'done'],
    ['doing', 'todo', 'todo'],
    ['done', 'doing', 'doing'],
  ] as const)('moves a %s task dropped on %s to %s', (status, column, next) => {
    expect(statusForKanbanDrop(status, column)).toBe(next);
  });

  it('ignores a drop on the column a task already occupies', () => {
    expect(statusForKanbanDrop('doing', 'doing')).toBeNull();
    expect(statusForKanbanDrop('done', 'done')).toBeNull();
  });
});
