import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ patchRecord: vi.fn() }));

vi.mock('@ops-dashboard/core', async () => {
  const actual = await vi.importActual<typeof import('@ops-dashboard/core')>('@ops-dashboard/core');
  return {
    ...actual,
    getDb: () => ({
      organizations: { toArray: async () => [] },
      notes: { get: async () => ({ id: 'note-1', body: '' }) },
    }),
  };
});

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
import { createQuote, updateQuote } from './quotes';
import { createPerson, updatePerson } from './people';
import { createDomain, updateDomain } from './domains';
import { updateOrganization } from './organizations';

beforeEach(() => vi.clearAllMocks());

describe('book inputs', () => {
  it('normalizes optional creation fields', async () => {
    await expect(
      createBook({ title: '  Deep Work  ', author: '  Cal Newport  ', isbn: '  123  ' }),
    ).resolves.toMatchObject({ title: 'Deep Work', author: 'Cal Newport', isbn: '123' });
  });

  it('validates and normalizes updates before persistence', async () => {
    await updateBook('book-1', {
      title: '  Deep Work  ',
      author: '   ',
      rating: 5,
      tags: [' focus ', 'focus'],
    });
    expect(mocks.patchRecord).toHaveBeenCalledWith('books', 'book-1', {
      title: 'Deep Work',
      author: undefined,
      rating: 5,
      tags: ['focus'],
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

  it('normalizes checklist items and rejects duplicate identifiers', async () => {
    await updateContent('content-1', {
      checklist: [{ id: ' item-1 ', text: ' Draft copy ', done: false }],
    });
    expect(mocks.patchRecord).toHaveBeenCalledWith('content', 'content-1', {
      checklist: [{ id: 'item-1', text: 'Draft copy', done: false }],
    });

    expect(() =>
      updateContent('content-1', {
        checklist: [
          { id: 'item-1', text: 'Draft', done: false },
          { id: 'item-1', text: 'Review', done: true },
        ],
      }),
    ).toThrow('Content checklist must be valid');
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
    expect(() => setCaptureRoute('capture-1', null as never)).toThrow(
      'Capture route must be valid',
    );
    expect(() => setCaptureRoute('capture-1', { type: 'task', id: 42 } as never)).toThrow(
      'Capture route must be valid',
    );
    expect(() =>
      setCaptureRoute('capture-1', { type: 'task', id: 'task-1' }, 'task', 42 as never),
    ).toThrow('Capture summary must be valid');
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

  it('rejects incomplete or malformed notification references', () => {
    expect(() => pushNotification({ title: 'Saved', kind: 'capture', refType: 'task' })).toThrow(
      'Notification reference must include a type and id',
    );
    expect(() => pushNotification({ title: 'Saved', kind: 'capture', refId: 42 as never })).toThrow(
      'Notification reference must be valid',
    );
  });
});

describe('journal inputs', () => {
  it('normalizes collection fields on creation', async () => {
    await expect(
      createJournalEntry({
        body: '  Good day  ',
        mood: '  calm  ',
        mediaUrls: [' image.jpg ', ' ', 'image.jpg'],
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
    await expect(updateNote('note-1', { body: '   ' })).rejects.toThrow('Note content is required');
  });
});

describe('quote inputs', () => {
  it('normalizes optional creation fields', async () => {
    await expect(
      createQuote({ text: '  Stay curious.  ', author: '  A. Person  ', tags: [' idea ', 'idea'] }),
    ).resolves.toMatchObject({ text: 'Stay curious.', author: 'A. Person', tags: ['idea'] });
  });

  it('validates and normalizes quote edits', async () => {
    await updateQuote('quote-1', { text: '  Stay curious.  ', source: '   ' });
    expect(mocks.patchRecord).toHaveBeenCalledWith('quotes', 'quote-1', {
      text: 'Stay curious.',
      source: undefined,
    });

    expect(() => updateQuote('quote-1', { text: '   ' })).toThrow('Quote text is required');
    expect(() => updateQuote('quote-1', { sourceType: 'video' as never })).toThrow(
      'Quote source type must be valid',
    );
    expect(() =>
      updateQuote('quote-1', { thoughts: [{ id: '', text: 'Idea', at: 'not-a-date' }] }),
    ).toThrow('Quote thoughts must be valid');
    expect(() => updateQuote('quote-1', { thoughts: [null] as never })).toThrow(
      'Quote thoughts must be valid',
    );
    expect(() =>
      updateQuote('quote-1', {
        thoughts: [
          { id: 'thought-1', text: 'First', at: '2026-08-17T12:00:00.000Z' },
          { id: ' thought-1 ', text: 'Second', at: '2026-08-17T13:00:00.000Z' },
        ],
      }),
    ).toThrow('Quote thoughts must be valid');
  });
});

describe('person inputs', () => {
  it('normalizes optional creation fields', async () => {
    await expect(
      createPerson({ name: '  Alex Morgan  ', relationship: '  colleague  ' }),
    ).resolves.toMatchObject({ name: 'Alex Morgan', relationship: 'colleague' });
  });

  it('validates and normalizes person edits', async () => {
    await updatePerson('person-1', {
      name: '  Alex Morgan  ',
      relationship: '   ',
      tags: [' work ', 'work'],
    });
    expect(mocks.patchRecord).toHaveBeenCalledWith('people', 'person-1', {
      name: 'Alex Morgan',
      relationship: undefined,
      tags: ['work'],
    });

    expect(() => updatePerson('person-1', { name: '   ' })).toThrow('Person name is required');
    expect(() =>
      updatePerson('person-1', {
        interactions: [{ id: 'interaction-1', date: 'invalid', note: 'Call' }],
      }),
    ).toThrow('Person interactions must be valid');
    expect(() =>
      updatePerson('person-1', {
        interactions: [{ id: 'interaction-1', date: 'August 16, 2026', note: 'Call' }],
      }),
    ).toThrow('Person interactions must be valid');
    expect(() =>
      updatePerson('person-1', {
        facts: [
          { id: 'fact-1', label: 'Timezone', value: 'Central' },
          { id: ' fact-1 ', label: 'Office', value: 'Chicago' },
        ],
      }),
    ).toThrow('Person facts must be valid');
    expect(() =>
      updatePerson('person-1', {
        interactions: [
          { id: 'interaction-1', date: '2026-08-16', note: 'Call' },
          { id: 'interaction-1', date: '2026-08-17', note: 'Email' },
        ],
      }),
    ).toThrow('Person interactions must be valid');
  });
});

describe('domain inputs', () => {
  it('normalizes optional creation fields', async () => {
    await expect(
      createDomain({
        name: '  Health  ',
        color: '  #0a6  ',
        icon: '  heart  ',
        description: '  Wellbeing  ',
      }),
    ).resolves.toMatchObject({
      name: 'Health',
      color: '#0a6',
      icon: 'heart',
      description: 'Wellbeing',
    });
  });

  it('validates and normalizes domain edits', async () => {
    await updateDomain('domain-1', { name: '  Health  ', description: '   ', order: 4 });
    expect(mocks.patchRecord).toHaveBeenCalledWith('domains', 'domain-1', {
      name: 'Health',
      description: undefined,
      order: 4,
    });

    expect(() => updateDomain('domain-1', { color: '   ' })).toThrow('Domain color is required');
    expect(() => updateDomain('domain-1', { order: Number.NaN })).toThrow(
      'Domain order must be finite',
    );
  });
});

describe('organization inputs', () => {
  it('validates and normalizes organization edits', async () => {
    await updateOrganization('org-1', { name: '  Acme  ', color: '  #123  ', order: 2 });
    expect(mocks.patchRecord).toHaveBeenCalledWith('organizations', 'org-1', {
      name: 'Acme',
      color: '#123',
      order: 2,
    });

    expect(() => updateOrganization('org-1', { name: '   ' })).toThrow(
      'Organization name is required',
    );
    expect(() => updateOrganization('org-1', { order: Number.POSITIVE_INFINITY })).toThrow(
      'Organization order must be finite',
    );
  });
});

describe('required update fields', () => {
  it('rejects undefined values for required entity fields', () => {
    expect(() => updateBook('book-1', { title: undefined } as never)).toThrow(
      'Book title is required',
    );
    expect(() => updateContent('content-1', { type: undefined } as never)).toThrow(
      'Content type must be valid',
    );
    expect(() => updateJournalEntry('journal-1', { date: undefined } as never)).toThrow(
      'Journal entry date must be valid',
    );
    expect(() => updateNote('note-1', { body: undefined } as never)).toThrow(
      'Note body must be valid',
    );
    expect(() => updateQuote('quote-1', { text: undefined } as never)).toThrow(
      'Quote text is required',
    );
    expect(() => updatePerson('person-1', { name: undefined } as never)).toThrow(
      'Person name is required',
    );
    expect(() => updateDomain('domain-1', { color: undefined } as never)).toThrow(
      'Domain color is required',
    );
    expect(() => updateOrganization('org-1', { order: undefined } as never)).toThrow(
      'Organization order must be finite',
    );
  });

  it('rejects malformed string collections', () => {
    expect(() => updateBook('book-1', { tags: [42] as never })).toThrow('Book tags must be valid');
    expect(() => updateJournalEntry('journal-1', { mediaUrls: [null] as never })).toThrow(
      'Journal entry media must be valid',
    );
    expect(() => updateJournalEntry('journal-1', { tags: [{}] as never })).toThrow(
      'Journal entry tags must be valid',
    );
    expect(() => updateNote('note-1', { tags: [false] as never })).toThrow(
      'Note tags must be valid',
    );
    expect(() => updateQuote('quote-1', { tags: [1] as never })).toThrow(
      'Quote tags must be valid',
    );
    expect(() => updatePerson('person-1', { tags: [undefined] as never })).toThrow(
      'Person tags must be valid',
    );
  });
});
