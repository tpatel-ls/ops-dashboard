import { describe, expect, it } from 'vitest';
import { journalExtractionSystem, normalizeJournalExtraction } from './journal-extraction';

describe('normalizeJournalExtraction', () => {
  it('rejects incomplete model results', () => {
    expect(normalizeJournalExtraction({ summary: 'Summary', body: '   ' }, [])).toBeNull();
  });

  it('keeps only known habits and returns their canonical names', () => {
    expect(
      normalizeJournalExtraction(
        {
          summary: '  Solid day  ',
          body: '  Finished the morning routine.  ',
          mood: 'UNKNOWN',
          tags: [' Health ', 'health', 'Planning'],
          habitsDone: ['morning walk', 'Invented habit', 'MORNING WALK'],
        },
        ['Morning Walk', 'Read'],
      ),
    ).toEqual({
      summary: 'Solid day',
      body: 'Finished the morning routine.',
      mood: 'neutral',
      tags: ['health', 'planning'],
      habitsDone: ['Morning Walk'],
    });
  });

  it('normalizes Unicode-equivalent tags and routine names', () => {
    expect(
      normalizeJournalExtraction(
        {
          summary: 'Done',
          body: 'Completed the caf\u00e9 walk.',
          tags: ['Caf\u00e9', 'Cafe\u0301'],
          habitsDone: ['Ｍｏｒｎｉｎｇ Walk'],
        },
        ['Morning Walk'],
      ),
    ).toMatchObject({ tags: ['café'], habitsDone: ['Morning Walk'] });
  });
});

describe('journalExtractionSystem', () => {
  it('keeps extraction rules and routine names in the system instruction', () => {
    const prompt = journalExtractionSystem(['Morning Walk', 'Read']);

    expect(prompt).toContain('Call extract_journal exactly once');
    expect(prompt).toContain(JSON.stringify(['Morning Walk', 'Read']));
  });
});
