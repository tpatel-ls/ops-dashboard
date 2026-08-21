import { describe, expect, it } from 'vitest';
import {
  acceptedBrainDumpItems,
  fallbackCaptureLines,
  journalEntrySource,
  normalizeBrainDumpItem,
  normalizeCaptureKind,
  normalizeCaptureFoodItems,
  normalizeCapturePriority,
  normalizeCaptureTags,
  routineCaptureNeedsChange,
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

  it('applies the response limit after discarding malformed items', () => {
    const items = [
      ...Array.from({ length: 100 }, () => ({ title: '   ' })),
      { kind: 'task', title: 'Keep this valid task' },
    ];

    expect(acceptedBrainDumpItems(true, { ok: true, items })).toEqual([
      { kind: 'task', title: 'Keep this valid task' },
    ]);
  });

  it('rejects malformed response shapes and unusable items', () => {
    expect(acceptedBrainDumpItems(true, null)).toBeNull();
    expect(acceptedBrainDumpItems(true, { ok: true, items: [null, { title: '   ' }] })).toBeNull();
  });
});

describe('normalizeBrainDumpItem', () => {
  it('bounds untrusted AI text without splitting Unicode characters', () => {
    const item = normalizeBrainDumpItem({
      title: `  ${'x'.repeat(499)}😀extra  `,
      notes: 'n'.repeat(2_100),
      dueText: 'd'.repeat(250),
      projectName: 'p'.repeat(250),
      routineName: 'r'.repeat(250),
    });

    expect(Array.from(item?.title ?? '')).toHaveLength(500);
    expect(item?.title.endsWith('😀')).toBe(true);
    expect(Array.from(item?.notes ?? '')).toHaveLength(2_000);
    expect(Array.from(item?.dueText ?? '')).toHaveLength(200);
    expect(Array.from(item?.projectName ?? '')).toHaveLength(200);
    expect(Array.from(item?.routineName ?? '')).toHaveLength(200);
  });
});

describe('fallbackCaptureLines', () => {
  it('bounds offline record creation while ignoring empty lines', () => {
    const text = Array.from({ length: 105 }, (_, index) => `Task ${index}\n\n`).join('');

    expect(fallbackCaptureLines(text)).toHaveLength(100);
    expect(fallbackCaptureLines('  First  \r\n\r\n Second ')).toEqual(['First', 'Second']);
  });

  it('bounds each offline task title without splitting Unicode characters', () => {
    const [line] = fallbackCaptureLines(`${'x'.repeat(499)}😀overflow`);

    expect(Array.from(line ?? '')).toHaveLength(500);
    expect(line?.endsWith('😀')).toBe(true);
  });
});

describe('normalizeCaptureTags', () => {
  it('trims, normalizes, and deduplicates untrusted AI tags', () => {
    expect(normalizeCaptureTags([' Launch ', 'launch', '', 'CUSTOMER'])).toEqual([
      'launch',
      'customer',
    ]);
  });

  it('bounds untrusted tag counts and Unicode-safe lengths', () => {
    const tags = Array.from({ length: 25 }, (_, index) => `${index}-${'x'.repeat(70)}😀`);
    const result = normalizeCaptureTags(tags);

    expect(result).toHaveLength(20);
    expect(result.every((tag) => Array.from(tag).length === 64)).toBe(true);
    expect(result.some((tag) => tag.includes('\ud83d'))).toBe(false);
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

describe('routineCaptureNeedsChange', () => {
  it('preserves a routine completion that predates the capture', () => {
    expect(routineCaptureNeedsChange({ done: true })).toBe(false);
    expect(routineCaptureNeedsChange({ done: false })).toBe(true);
    expect(routineCaptureNeedsChange(undefined)).toBe(true);
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

describe('normalizeCapturePriority', () => {
  it('rejects non-finite AI values instead of promoting them to urgent', () => {
    expect(normalizeCapturePriority(Number.POSITIVE_INFINITY)).toBe(0);
    expect(normalizeCapturePriority(Number.NEGATIVE_INFINITY)).toBe(0);
    expect(normalizeCapturePriority(Number.NaN)).toBe(0);
  });

  it('rounds and clamps finite AI values to supported priorities', () => {
    expect(normalizeCapturePriority(1.6)).toBe(2);
    expect(normalizeCapturePriority(-4)).toBe(0);
    expect(normalizeCapturePriority(8)).toBe(3);
  });
});

describe('normalizeCaptureFoodItems', () => {
  it('bounds AI meal sizes, text fields, and nutrition estimates', () => {
    const items = Array.from({ length: 105 }, (_, index) => ({
      name: `Food ${index} ${'x'.repeat(220)}`,
      quantity: 'y'.repeat(220),
      calories: Number.MAX_VALUE,
      protein: -4,
    }));

    const result = normalizeCaptureFoodItems(items);

    expect(result).toHaveLength(100);
    expect(Array.from(result[0]!.name)).toHaveLength(200);
    expect(Array.from(result[0]!.quantity ?? '')).toHaveLength(200);
    expect(result[0]).toMatchObject({ calories: 1_000_000, protein: 0 });
  });

  it('ignores malformed AI meal entries', () => {
    expect(normalizeCaptureFoodItems([null, 42, { name: '  ' }, { name: ' Eggs ' }])).toEqual([
      { name: 'Eggs', calories: 0 },
    ]);
  });
});
