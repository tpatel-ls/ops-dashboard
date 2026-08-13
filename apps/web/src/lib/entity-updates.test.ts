import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ patchRecord: vi.fn() }));

vi.mock('./records', () => ({
  newRecord: vi.fn((value: object) => value),
  putRecord: vi.fn(async (_table: string, value: object) => value),
  patchRecord: mocks.patchRecord,
  softDeleteRecord: vi.fn(),
}));

import { createBook, updateBook } from './books';
import { createContent, updateContent } from './content';
import { createCapture, setCaptureRoute } from './captures';

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

describe('content inputs', () => {
  it('normalizes optional creation fields', async () => {
    await expect(
      createContent({ title: '  Launch plan  ', channel: '  Blog  ', url: '  /launch  ' }),
    ).resolves.toMatchObject({ title: 'Launch plan', channel: 'Blog', url: '/launch' });
  });

  it('validates and normalizes updates before persistence', async () => {
    await updateContent('content-1', {
      title: '  Launch plan  ',
      outline: '   ',
      publishDate: '2026-08-20',
    });
    expect(mocks.patchRecord).toHaveBeenCalledWith('content', 'content-1', {
      title: 'Launch plan',
      outline: undefined,
      publishDate: '2026-08-20',
    });

    expect(() => updateContent('content-1', { publishDate: '2026-02-30' })).toThrow(
      'Content publish date must be a valid calendar day',
    );
    expect(() => updateContent('content-1', { status: 'missing' as never })).toThrow(
      'Content status must be valid',
    );
  });
});

describe('capture inputs', () => {
  it('rejects unknown capture sources', () => {
    expect(() => createCapture('Call Alex', 'email' as never)).toThrow(
      'Capture source must be valid',
    );
  });

  it('validates and normalizes routed capture metadata', async () => {
    await setCaptureRoute('capture-1', { type: 'task', id: '  task-1  ' }, 'task', '  Call Alex  ');
    expect(mocks.patchRecord).toHaveBeenCalledWith('captures', 'capture-1', {
      status: 'triaged',
      routedTo: { type: 'task', id: 'task-1' },
      aiKind: 'task',
      aiSummary: 'Call Alex',
    });

    expect(() => setCaptureRoute('capture-1', { type: 'task', id: '   ' })).toThrow(
      'Capture route must be valid',
    );
    expect(() =>
      setCaptureRoute('capture-1', { type: 'task', id: 'task-1' }, 'unknown' as never),
    ).toThrow('Capture kind must be valid');
  });
});
