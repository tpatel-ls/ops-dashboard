import { describe, expect, it } from 'vitest';
import { compareNoteRecency, safeNoteTags, updateNote } from './notes';

describe('compareNoteRecency', () => {
  it('filters malformed synced note tags', () => {
    expect(safeNoteTags(['idea', 7, null, 'idea'])).toEqual(['idea']);
  });

  it('trims, deduplicates, and bounds synced note tags', () => {
    expect(
      safeNoteTags([
        ' Work ',
        'work',
        'x'.repeat(65),
        ...Array.from({ length: 50 }, (_, i) => `tag-${i}`),
      ]),
    ).toEqual(['Work', ...Array.from({ length: 47 }, (_, i) => `tag-${i}`)]);
  });

  it('orders notes by creation instant and places malformed metadata last', () => {
    const notes = [
      { id: 'invalid', createdAt: 'invalid' },
      { id: 'earlier', createdAt: '2026-08-24T14:00:00Z' },
      { id: 'later', createdAt: '2026-08-24T09:30:00-05:00' },
    ];

    expect(notes.sort(compareNoteRecency).map((note) => note.id)).toEqual([
      'later',
      'earlier',
      'invalid',
    ]);
  });

  it('does not throw when a synced id is malformed', () => {
    const notes = [
      { id: null as never, createdAt: '2026-08-24T14:00:00Z' },
      { id: 'valid', createdAt: '2026-08-24T14:00:00Z' },
    ];

    expect(() => notes.sort(compareNoteRecency)).not.toThrow();
    expect(notes.map((note) => note.id)).toEqual([null, 'valid']);
  });
});

describe('updateNote', () => {
  it('rejects an atomic update that clears both note fields', () => {
    expect(() => updateNote('note-1', { title: undefined, body: '   ' })).toThrow(
      'Note content is required',
    );
  });

  it('rejects non-string optional fields with validation errors', () => {
    expect(() => updateNote('note-1', { title: 42 as never })).toThrow('Note title must be valid');
    expect(() => updateNote('note-1', { source: 42 as never })).toThrow(
      'Note metadata must be valid',
    );
    expect(() => updateNote('note-1', { imageUrl: {} as never })).toThrow(
      'Note metadata must be valid',
    );
  });
});
