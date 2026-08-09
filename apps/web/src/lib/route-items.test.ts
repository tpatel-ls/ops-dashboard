import { describe, expect, it } from 'vitest';
import {
  acceptedBrainDumpItems,
  fallbackCaptureLines,
  journalEntrySource,
  normalizeCaptureKind,
  normalizeCaptureTags,
} from './route-items';

describe('acceptedBrainDumpItems', () => {
  it('rejects payloads returned with an unsuccessful HTTP status', () => {
    const items = [{ kind: 'task', title: 'Do not route this response' }];

    expect(acceptedBrainDumpItems(false, { ok: true, items })).toBeNull();
    expect(acceptedBrainDumpItems(true, { ok: true, items })).toEqual(items);
  });

  it('bounds the number of records one AI response can create', () => {
    const items = Array.from({ length: 101 }, (_, index) => ({
      kind: 'task',
      title: `Task ${index}`,
    }));

    expect(acceptedBrainDumpItems(true, { ok: true, items })).toHaveLength(100);
  });
});

describe('fallbackCaptureLines', () => {
  it('bounds offline record creation while ignoring empty lines', () => {
    const text = Array.from({ length: 105 }, (_, index) => `Task ${index}\n\n`).join('');

    expect(fallbackCaptureLines(text)).toHaveLength(100);
    expect(fallbackCaptureLines('  First  \r\n\r\n Second ')).toEqual(['First', 'Second']);
  });
});

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

describe('normalizeCaptureKind', () => {
  it('normalizes AI casing and whitespace before routing', () => {
    expect(normalizeCaptureKind(' Journal ')).toBe('journal');
    expect(normalizeCaptureKind('FOOD')).toBe('food');
    expect(normalizeCaptureKind('unknown')).toBe('task');
    expect(normalizeCaptureKind(undefined)).toBe('task');
  });
});
