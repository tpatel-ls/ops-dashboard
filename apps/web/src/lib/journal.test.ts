import { describe, expect, it } from 'vitest';
import { compareJournalEntries } from './journal';

describe('compareJournalEntries', () => {
  it('orders valid journal days before malformed records', () => {
    const entries = [
      { id: 'invalid', date: '2026-99-99', createdAt: '2026-08-26T15:00:00Z' },
      { id: 'older', date: '2026-08-24', createdAt: '2026-08-24T15:00:00Z' },
      { id: 'newer', date: '2026-08-25', createdAt: '2026-08-25T15:00:00Z' },
    ];

    expect(entries.sort(compareJournalEntries).map((entry) => entry.id)).toEqual([
      'newer',
      'older',
      'invalid',
    ]);
  });

  it('uses creation instants and ids to break same-day ties', () => {
    const entries = [
      { id: 'zulu', date: '2026-08-25', createdAt: 'invalid' },
      { id: 'bravo', date: '2026-08-25', createdAt: '2026-08-25T10:00:00-05:00' },
      { id: 'alpha', date: '2026-08-25', createdAt: '2026-08-25T15:00:00Z' },
    ];

    expect(entries.sort(compareJournalEntries).map((entry) => entry.id)).toEqual([
      'alpha',
      'bravo',
      'zulu',
    ]);
  });
});
