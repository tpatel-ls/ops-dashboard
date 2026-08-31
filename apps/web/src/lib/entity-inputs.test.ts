import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  newRecord: vi.fn((value: object) => value),
  putRecord: vi.fn((table: string, value: object) => Promise.resolve({ table, ...value })),
}));

vi.mock('./records', () => ({
  newRecord: mocks.newRecord,
  putRecord: mocks.putRecord,
  patchRecord: vi.fn(),
  softDeleteRecord: vi.fn(),
}));

import { createDomain } from './domains';
import { createCapture } from './captures';
import { createFoodLog } from './food-logs';
import { pushNotification } from './feed';
import { createJournalEntry } from './journal';
import { createBook } from './books';
import { createContent } from './content';
import { createNote } from './notes';
import { createPerson, makeFact, makeInteraction } from './people';
import { createQuote, makeThought } from './quotes';

beforeEach(() => vi.clearAllMocks());

describe('createDomain', () => {
  it('trims domain names before persistence', async () => {
    await createDomain({ name: '  Health  ', color: '#0a6' });

    expect(mocks.putRecord).toHaveBeenCalledWith(
      'domains',
      expect.objectContaining({ name: 'Health' }),
    );
  });

  it('rejects blank domain names before persistence', () => {
    expect(() => createDomain({ name: '   ', color: '#0a6' })).toThrow('Domain name is required');
    expect(mocks.putRecord).not.toHaveBeenCalled();
  });
});

describe('createCapture', () => {
  it('trims captured text before persistence', async () => {
    await createCapture('  Call the vendor  ');

    expect(mocks.putRecord).toHaveBeenCalledWith(
      'captures',
      expect.objectContaining({ raw: 'Call the vendor' }),
    );
  });

  it('rejects blank captures before persistence', () => {
    expect(() => createCapture('   ')).toThrow('Capture text is required');
    expect(mocks.putRecord).not.toHaveBeenCalled();
  });
});

describe('pushNotification', () => {
  it('trims notification content before persistence', async () => {
    await pushNotification({ title: '  Capture saved  ', body: '  Call Alex  ', kind: 'capture' });

    expect(mocks.putRecord).toHaveBeenCalledWith(
      'notifications',
      expect.objectContaining({ title: 'Capture saved', body: 'Call Alex' }),
    );
  });

  it('rejects blank notification titles before persistence', () => {
    expect(() => pushNotification({ title: '   ', kind: 'system' })).toThrow(
      'Notification title is required',
    );
    expect(mocks.putRecord).not.toHaveBeenCalled();
  });
});

describe('createPerson', () => {
  it('trims person names before persistence', async () => {
    await createPerson({ name: '  Avery Morgan  ' });

    expect(mocks.putRecord).toHaveBeenCalledWith(
      'people',
      expect.objectContaining({ name: 'Avery Morgan' }),
    );
  });

  it('rejects blank person names before persistence', () => {
    expect(() => createPerson({ name: '   ' })).toThrow('Person name is required');
    expect(mocks.putRecord).not.toHaveBeenCalled();
  });
});

describe('makeInteraction', () => {
  it('trims useful interaction notes', () => {
    expect(makeInteraction('  Discussed Q3 roadmap  ', '2026-08-05')).toMatchObject({
      date: '2026-08-05',
      note: 'Discussed Q3 roadmap',
    });
  });

  it('rejects blank notes and impossible dates', () => {
    expect(() => makeInteraction('   ', '2026-08-05')).toThrow('Interaction note is required');
    expect(() => makeInteraction('Follow up', '2026-02-30')).toThrow(
      'Interaction date must be valid',
    );
    expect(() => makeInteraction('Follow up', 'August 5, 2026')).toThrow(
      'Interaction date must be valid',
    );
  });

  it('canonicalizes timestamped interaction dates', () => {
    expect(makeInteraction('Follow up', '2026-08-05T07:00:00-05:00').date).toBe(
      '2026-08-05T12:00:00.000Z',
    );
  });
});

describe('makeFact', () => {
  it('trims fact labels and values', () => {
    expect(makeFact('  Timezone  ', '  Central  ')).toMatchObject({
      label: 'Timezone',
      value: 'Central',
    });
  });

  it('rejects incomplete facts', () => {
    expect(() => makeFact('   ', 'Central')).toThrow('Fact label and value are required');
    expect(() => makeFact('Timezone', '   ')).toThrow('Fact label and value are required');
  });
});

describe('createBook', () => {
  it('trims book titles before persistence', async () => {
    await createBook({ title: '  The Checklist Manifesto  ' });

    expect(mocks.putRecord).toHaveBeenCalledWith(
      'books',
      expect.objectContaining({ title: 'The Checklist Manifesto' }),
    );
  });

  it('rejects blank book titles before persistence', () => {
    expect(() => createBook({ title: '   ' })).toThrow('Book title is required');
    expect(mocks.putRecord).not.toHaveBeenCalled();
  });
});

describe('createQuote', () => {
  it('trims quote text before persistence', async () => {
    await createQuote({ text: '  Make it work, then make it better.  ' });

    expect(mocks.putRecord).toHaveBeenCalledWith(
      'quotes',
      expect.objectContaining({ text: 'Make it work, then make it better.' }),
    );
  });

  it('rejects blank quote text before persistence', () => {
    expect(() => createQuote({ text: '   ' })).toThrow('Quote text is required');
    expect(mocks.putRecord).not.toHaveBeenCalled();
  });
});

describe('makeThought', () => {
  it('trims thought text', () => {
    expect(makeThought('  Apply this to onboarding.  ').text).toBe('Apply this to onboarding.');
  });

  it('rejects blank thoughts', () => {
    expect(() => makeThought('   ')).toThrow('Thought text is required');
  });

  it('rejects oversized thoughts', () => {
    expect(() => makeThought('x'.repeat(2_001))).toThrow(
      'Thought text must contain at most 2000 characters',
    );
  });
});

describe('createContent', () => {
  it('trims content titles before persistence', async () => {
    await createContent({ title: '  August launch video  ' });

    expect(mocks.putRecord).toHaveBeenCalledWith(
      'content',
      expect.objectContaining({ title: 'August launch video' }),
    );
  });

  it('rejects blank content titles before persistence', () => {
    expect(() => createContent({ title: '   ' })).toThrow('Content title is required');
    expect(mocks.putRecord).not.toHaveBeenCalled();
  });
});

describe('createNote', () => {
  it('trims note text before persistence', async () => {
    await createNote({ title: '  Launch notes  ', body: '  Confirm rollout owner.  ' });

    expect(mocks.putRecord).toHaveBeenCalledWith(
      'notes',
      expect.objectContaining({ title: 'Launch notes', body: 'Confirm rollout owner.' }),
    );
  });

  it('rejects notes without a title or body', () => {
    expect(() => createNote({ title: '   ', body: '   ' })).toThrow('Note content is required');
    expect(mocks.putRecord).not.toHaveBeenCalled();
  });
});

describe('createJournalEntry', () => {
  it('trims journal bodies before persistence', async () => {
    await createJournalEntry({ body: '  Closed the launch checklist.  ' });

    expect(mocks.putRecord).toHaveBeenCalledWith(
      'journalEntries',
      expect.objectContaining({ body: 'Closed the launch checklist.' }),
    );
  });

  it('rejects blank journal bodies before persistence', () => {
    expect(() => createJournalEntry({ body: '   ' })).toThrow('Journal entry body is required');
    expect(mocks.putRecord).not.toHaveBeenCalled();
  });

  it('normalizes titles and rejects impossible journal dates', async () => {
    await createJournalEntry({ date: '2026-08-09', title: '  Daily review  ', body: 'Done.' });
    expect(mocks.putRecord).toHaveBeenCalledWith(
      'journalEntries',
      expect.objectContaining({ date: '2026-08-09', title: 'Daily review' }),
    );

    mocks.putRecord.mockClear();
    expect(() => createJournalEntry({ date: '2026-02-30', body: 'Impossible day' })).toThrow(
      'Journal entry date must be valid',
    );
    expect(mocks.putRecord).not.toHaveBeenCalled();
  });
});

describe('createFoodLog', () => {
  it('trims food descriptions before persistence', async () => {
    await createFoodLog({ description: '  Eggs and toast  ', items: [] });

    expect(mocks.putRecord).toHaveBeenCalledWith(
      'foodLogs',
      expect.objectContaining({ description: 'Eggs and toast' }),
    );
  });

  it('rejects blank food descriptions before persistence', () => {
    expect(() => createFoodLog({ description: '   ', items: [] })).toThrow(
      'Food description is required',
    );
    expect(mocks.putRecord).not.toHaveBeenCalled();
  });
});
