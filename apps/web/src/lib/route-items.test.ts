import { describe, expect, it } from 'vitest';
import { journalEntrySource, normalizeCaptureTags } from './route-items';

describe('normalizeCaptureTags', () => {
  it('trims, normalizes, and deduplicates untrusted AI tags', () => {
    expect(normalizeCaptureTags([' Launch ', 'launch', '', 'CUSTOMER'])).toEqual([
      'launch',
      'customer',
    ]);
  });
});

describe('journalEntrySource', () => {
  it('preserves voice provenance for spoken captures', () => {
    expect(journalEntrySource('voice')).toBe('voice');
    expect(journalEntrySource('watch')).toBe('voice');
    expect(journalEntrySource('text')).toBe('text');
    expect(journalEntrySource('notepad')).toBe('text');
  });
});
