import { describe, expect, it } from 'vitest';
import { linkOptions } from './link-options';

const rows = [
  { id: 'live' },
  { id: 'archived', archivedAt: '2026-10-01T00:00:00.000Z' },
  { id: 'deleted', deletedAt: '2026-10-01T00:00:00.000Z' },
];

describe('linkOptions', () => {
  it('lists live, unarchived records', () => {
    expect(linkOptions(rows, undefined).map((row) => row.id)).toEqual(['live']);
  });

  it('keeps the currently linked record even after it was archived', () => {
    expect(linkOptions(rows, 'archived').map((row) => row.id)).toEqual(['live', 'archived']);
  });

  it('never offers a deleted record, even the linked one', () => {
    expect(linkOptions(rows, 'deleted').map((row) => row.id)).toEqual(['live']);
  });
});
