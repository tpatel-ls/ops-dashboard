import { describe, expect, it } from 'vitest';
import { DEXIE_TABLES, SYNC_TABLES, fromRow, isSyncedTable, toRow } from './mapping';

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

describe('isSyncedTable', () => {
  it('accepts every table the mapping declares', () => {
    for (const table of DEXIE_TABLES) {
      expect(isSyncedTable(table)).toBe(true);
    }
    expect(DEXIE_TABLES).toHaveLength(Object.keys(SYNC_TABLES).length);
  });

  it('rejects a table with no Supabase counterpart', () => {
    // `reminders` is embedded as jsonb on tasks, so it is deliberately absent.
    expect(isSyncedTable('reminders')).toBe(false);
    expect(isSyncedTable('settings')).toBe(false);
    expect(isSyncedTable('')).toBe(false);
  });

  it('rejects inherited Object properties', () => {
    // The guard decides whether a stored outbox op is drained or discarded, and
    // op.table is only as trustworthy as the row it came from. A plain `in`
    // check would admit these and index SYNC_TABLES with a prototype member.
    for (const key of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
      expect(isSyncedTable(key)).toBe(false);
    }
  });
});
