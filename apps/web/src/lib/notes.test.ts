import { describe, expect, it } from 'vitest';
import { compareNoteRecency, safeNoteTags, updateNote } from './notes';

describe('compareNoteRecency', () => {
  it('filters malformed synced note tags', () => {
    expect(safeNoteTags(['idea', 7, null])).toEqual(['idea']);
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
});

describe('updateNote', () => {
  it('rejects an atomic update that clears both note fields', () => {
    expect(() => updateNote('note-1', { title: undefined, body: '   ' })).toThrow(
      'Note content is required',
    );
  });
});
