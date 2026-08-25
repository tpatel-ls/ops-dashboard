import { describe, expect, it } from 'vitest';
import { fromRow, toRow } from './mapping';

describe('sync row mapping', () => {
  it('sends explicit optional-field clears as database nulls', () => {
    expect(
      toRow(
        {
          id: 'task-1',
          title: 'Call supplier',
          notes: undefined,
        },
        'user-1',
      ),
    ).toEqual({
      id: 'task-1',
      title: 'Call supplier',
      notes: null,
      user_id: 'user-1',
    });
  });

  it('does not invent optional columns that are absent locally', () => {
    expect(toRow({ id: 'task-1', title: 'Call supplier' }, 'user-1')).not.toHaveProperty('notes');
  });

  it('removes ownership and database nulls from inbound rows', () => {
    expect(
      fromRow({
        id: 'task-1',
        user_id: 'user-1',
        due_at: null,
        created_at: '2026-08-25T12:00:00.000Z',
      }),
    ).toEqual({ id: 'task-1', createdAt: '2026-08-25T12:00:00.000Z' });
  });
});
