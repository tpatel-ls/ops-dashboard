import { describe, expect, it } from 'vitest';
import { compareBookRecency } from './books';

describe('compareBookRecency', () => {
  it('orders books by creation instant and places malformed metadata last', () => {
    const books = [
      { id: 'invalid', createdAt: 'invalid' },
      { id: 'earlier', createdAt: '2026-08-24T14:00:00Z' },
      { id: 'later', createdAt: '2026-08-24T09:30:00-05:00' },
    ];

    expect(books.sort(compareBookRecency).map((book) => book.id)).toEqual([
      'later',
      'earlier',
      'invalid',
    ]);
  });
});
