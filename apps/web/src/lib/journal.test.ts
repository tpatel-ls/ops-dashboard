import { describe, expect, it } from 'vitest';
import type { JournalEntry } from '@ops-dashboard/core';
import {
  compareJournalEntries,
  journalEntriesBetween,
  journalDateLabel,
  latestJournalEntry,
  safeJournalTags,
  updateJournalEntry,
} from './journal';

describe('journal entry validation', () => {
  it('rejects non-string optional text fields with validation errors', () => {
    expect(() => updateJournalEntry('journal-1', { title: 42 as never })).toThrow(
      'Journal entry title must be valid.',
    );
    expect(() => updateJournalEntry('journal-1', { mood: 42 as never })).toThrow(
      'Journal entry mood must be valid.',
    );
  });
});

describe('compareJournalEntries', () => {
  it('filters malformed synced journal tags', () => {
    expect(safeJournalTags(['health', null, 4, 'health'])).toEqual(['health']);
  });

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

  it('keeps sorting when a synced id has the wrong type', () => {
    const malformed = { id: null as never, date: '2026-08-25', createdAt: 'invalid' };
    const valid = { id: 'valid', date: '2026-08-25', createdAt: 'invalid' };

    expect([valid, malformed].sort(compareJournalEntries).map((entry) => entry.id)).toEqual([
      null,
      'valid',
    ]);
  });
});

describe('latestJournalEntry', () => {
  it('uses the shared safe ordering for resurfacing entries', () => {
    const latest = latestJournalEntry([
      {
        id: 'invalid',
        date: 'not-a-day',
        createdAt: '2026-08-26T15:00:00Z',
        body: 'Invalid',
      },
      {
        id: 'latest',
        date: '2026-08-25',
        createdAt: '2026-08-25T15:00:00Z',
        body: 'Latest',
      },
      {
        id: 'deleted',
        date: '2026-08-30',
        createdAt: '2026-08-30T15:00:00Z',
        body: 'Deleted',
        deletedAt: '2026-08-30T16:00:00Z',
      },
    ] as never);

    expect(latest?.id).toBe('latest');
  });

  it('does not reorder the caller collection', () => {
    const entries = [
      { id: 'older', date: '2026-08-24', createdAt: '2026-08-24T15:00:00Z' },
      { id: 'newer', date: '2026-08-25', createdAt: '2026-08-25T15:00:00Z' },
    ] as JournalEntry[];

    latestJournalEntry(entries);

    expect(entries.map((entry) => entry.id)).toEqual(['older', 'newer']);
  });
});

describe('journalEntriesBetween', () => {
  it('matches synced timestamp dates by their local calendar day', () => {
    const entries = [
      { id: 'timestamp', date: '2026-08-24T13:00:00.000Z', deletedAt: undefined },
      { id: 'outside', date: '2026-08-26', deletedAt: undefined },
      { id: 'deleted', date: '2026-08-24', deletedAt: '2026-08-25T00:00:00Z' },
    ] as never;

    expect(
      journalEntriesBetween(entries, '2026-08-24', '2026-08-25').map((entry) => entry.id),
    ).toEqual(['timestamp']);
  });

  it('rejects invalid and inverted day ranges', () => {
    expect(journalEntriesBetween([], '2026-02-30', '2026-03-01')).toEqual([]);
    expect(journalEntriesBetween([], '2026-08-25', '2026-08-24')).toEqual([]);
  });
});

describe('journalDateLabel', () => {
  it('formats a valid calendar day with the requested pattern', () => {
    expect(journalDateLabel('2026-07-28', 'EEEE, d MMM yyyy')).toBe('Tuesday, 28 Jul 2026');
    expect(journalDateLabel('2026-07-28', 'MMM d, yyyy')).toBe('Jul 28, 2026');
  });

  it('falls back to the raw value for a day that does not exist', () => {
    expect(journalDateLabel('2026-02-30', 'MMM d, yyyy')).toBe('2026-02-30');
    expect(journalDateLabel('2026-13-01', 'MMM d, yyyy')).toBe('2026-13-01');
  });

  it('falls back to the raw value for a non calendar-day string', () => {
    expect(journalDateLabel('2026-07-28T10:00:00.000Z', 'MMM d, yyyy')).toBe(
      '2026-07-28T10:00:00.000Z',
    );
    expect(journalDateLabel('not-a-date', 'MMM d, yyyy')).toBe('not-a-date');
    expect(journalDateLabel('', 'MMM d, yyyy')).toBe('');
  });

  it('never throws on a value date-fns would reject', () => {
    for (const value of ['', 'not-a-date', '2026-02-30', '2026-13-01', 'null']) {
      expect(() => journalDateLabel(value, 'MMM d, yyyy')).not.toThrow();
    }
  });
});
