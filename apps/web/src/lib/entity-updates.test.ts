import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ patchRecord: vi.fn() }));

vi.mock('./records', () => ({
  newRecord: vi.fn((value: object) => value),
  putRecord: vi.fn(async (_table: string, value: object) => value),
  patchRecord: mocks.patchRecord,
  softDeleteRecord: vi.fn(),
}));

import { createBook, updateBook } from './books';

beforeEach(() => vi.clearAllMocks());

describe('book inputs', () => {
  it('normalizes optional creation fields', async () => {
    await expect(
      createBook({ title: '  Deep Work  ', author: '  Cal Newport  ', isbn: '  123  ' }),
    ).resolves.toMatchObject({ title: 'Deep Work', author: 'Cal Newport', isbn: '123' });
  });

  it('validates and normalizes updates before persistence', async () => {
    await updateBook('book-1', { title: '  Deep Work  ', author: '   ', rating: 5 });
    expect(mocks.patchRecord).toHaveBeenCalledWith('books', 'book-1', {
      title: 'Deep Work',
      author: undefined,
      rating: 5,
    });

    expect(() => updateBook('book-1', { rating: 6 })).toThrow(
      'Book rating must be an integer from 1 to 5',
    );
    expect(() => updateBook('book-1', { status: 'lost' as never })).toThrow(
      'Book status must be valid',
    );
  });
});
