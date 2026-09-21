import { describe, expect, it } from 'vitest';
import { compareCreatedAtRecency, newestFirstBy } from './recency';

const record = (id: string, createdAt: string) => ({ id, createdAt });

describe('compareCreatedAtRecency', () => {
  it('orders newest first', () => {
    const items = [
      record('older', '2026-01-01T00:00:00.000Z'),
      record('newest', '2026-03-01T00:00:00.000Z'),
      record('middle', '2026-02-01T00:00:00.000Z'),
    ];
    expect(items.sort(compareCreatedAtRecency).map((item) => item.id)).toEqual([
      'newest',
      'middle',
      'older',
    ]);
  });

  it('breaks an exact tie on the id so the order is stable', () => {
    const at = '2026-01-01T00:00:00.000Z';
    const items = [record('b', at), record('a', at), record('c', at)];
    expect(items.sort(compareCreatedAtRecency).map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });

  it('sorts unparseable timestamps after every valid one', () => {
    const items = [
      record('bad', 'not a date'),
      record('old', '2026-01-01T00:00:00.000Z'),
      record('new', '2026-02-01T00:00:00.000Z'),
    ];
    expect(items.sort(compareCreatedAtRecency).map((item) => item.id)).toEqual([
      'new',
      'old',
      'bad',
    ]);
  });

  it('falls back to the id when both timestamps are unparseable', () => {
    const items = [record('b', ''), record('a', 'nope')];
    expect(items.sort(compareCreatedAtRecency).map((item) => item.id)).toEqual(['a', 'b']);
  });
});

describe('newestFirstBy', () => {
  it('reads whichever timestamp field the record uses', () => {
    const compare = newestFirstBy('date');
    const items = [
      { id: 'old', date: '2026-01-01T00:00:00.000Z' },
      { id: 'new', date: '2026-05-01T00:00:00.000Z' },
    ];
    expect(items.sort(compare).map((item) => item.id)).toEqual(['new', 'old']);
  });
});
