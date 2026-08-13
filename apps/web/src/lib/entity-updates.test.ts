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
import { pushNotification } from './feed';
import { createJournalEntry, updateJournalEntry } from './journal';
import { createNote, updateNote } from './notes';

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

describe('notification inputs', () => {
  it('normalizes reference metadata', async () => {
    await expect(
      pushNotification({
        title: 'Saved',
        kind: 'capture',
        refType: '  task  ',
        refId: '  task-1  ',
      }),
    ).resolves.toMatchObject({ refType: 'task', refId: 'task-1' });
  });

  it('rejects unknown notification kinds', () => {
    expect(() => pushNotification({ title: 'Saved', kind: 'email' as never })).toThrow(
      'Notification kind must be valid',
    );
  });
});

describe('journal inputs', () => {
  it('normalizes collection fields on creation', async () => {
    await expect(
      createJournalEntry({
        body: '  Good day  ',
        mood: '  calm  ',
        mediaUrls: [' image.jpg ', ' '],
        tags: [' work ', 'work'],
      }),
    ).resolves.toMatchObject({
      body: 'Good day',
      mood: 'calm',
      mediaUrls: ['image.jpg'],
      tags: ['work'],
    });
  });

  it('validates journal updates before persistence', async () => {
    await updateJournalEntry('journal-1', { title: '  Daily review  ', tags: [' done ', 'done'] });
    expect(mocks.patchRecord).toHaveBeenCalledWith('journalEntries', 'journal-1', {
      title: 'Daily review',
      tags: ['done'],
    });

    expect(() => updateJournalEntry('journal-1', { body: '   ' })).toThrow(
      'Journal entry body is required',
    );
    expect(() => updateJournalEntry('journal-1', { date: '2026-02-30' })).toThrow(
      'Journal entry date must be valid',
    );
  });
});

describe('note inputs', () => {
  it('normalizes optional creation fields', async () => {
    await expect(
      createNote({
        title: '  Launch  ',
        body: '  Confirm owner.  ',
        source: '  meeting  ',
        tags: [' work ', 'work'],
      }),
    ).resolves.toMatchObject({
      title: 'Launch',
      body: 'Confirm owner.',
      source: 'meeting',
      tags: ['work'],
    });
  });

  it('normalizes edits and rejects an explicitly empty note', async () => {
    await updateNote('note-1', { title: '  Launch  ', body: '  Confirm owner.  ' });
    expect(mocks.patchRecord).toHaveBeenCalledWith('notes', 'note-1', {
      title: 'Launch',
      body: 'Confirm owner.',
    });

    expect(() => updateNote('note-1', { title: '   ', body: '   ' })).toThrow(
      'Note content is required',
    );
  });
});
