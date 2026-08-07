import { describe, expect, it } from 'vitest';
import { normalizeJournalExtraction } from './journal-extraction';

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
});
