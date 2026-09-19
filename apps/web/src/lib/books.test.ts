import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getBook: vi.fn(),
  patchRecord: vi.fn(),
}));

vi.mock('@ops-dashboard/core', async () => {
  const actual = await vi.importActual<typeof import('@ops-dashboard/core')>('@ops-dashboard/core');
  return { ...actual, getDb: () => ({ books: { get: mocks.getBook } }) };
});

vi.mock('./records', () => ({
  newRecord: vi.fn(),
  putRecord: vi.fn(),
  patchRecord: mocks.patchRecord,
  softDeleteRecord: vi.fn(),
}));

import { bookRatingStars, compareBookRecency, updateBook } from './books';

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

describe('updateBook', () => {
  beforeEach(() => {
    mocks.getBook.mockReset().mockResolvedValue({
      id: 'book-1',
      title: 'Book',
      status: 'reading',
      startedAt: '2026-08-20T12:00:00.000Z',
      tags: [],
    });
    mocks.patchRecord.mockReset();
  });

  it('rejects a finish date before the stored start date', async () => {
    await expect(updateBook('book-1', { finishedAt: '2026-08-19T12:00:00.000Z' })).rejects.toThrow(
      'Book finish date must not precede its start date',
    );
    expect(mocks.patchRecord).not.toHaveBeenCalled();
  });

  it('accepts and canonicalizes a valid finish date', async () => {
    await updateBook('book-1', { finishedAt: '2026-08-21T07:00:00-05:00' });

    expect(mocks.patchRecord).toHaveBeenCalledWith('books', 'book-1', {
      finishedAt: '2026-08-21T12:00:00.000Z',
    });
  });
});

describe('bookRatingStars', () => {
  it('keeps a rating the write path would accept', () => {
    for (const rating of [1, 2, 3, 4, 5]) {
      expect(bookRatingStars(rating)).toBe(rating);
    }
  });

  it('treats an unset rating as no stars', () => {
    expect(bookRatingStars(undefined)).toBe(0);
    expect(bookRatingStars(0)).toBe(0);
  });

  it('drops a synced rating updateBook would have rejected', () => {
    expect(bookRatingStars(6)).toBe(0);
    expect(bookRatingStars(99)).toBe(0);
    expect(bookRatingStars(-2)).toBe(0);
    expect(bookRatingStars(3.5)).toBe(0);
    expect(bookRatingStars(Number.NaN)).toBe(0);
    expect(bookRatingStars('4' as unknown as number)).toBe(0);
  });
});
