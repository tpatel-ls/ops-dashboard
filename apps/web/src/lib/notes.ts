'use client';

import type { Note } from '@drift/core';
import { newRecord, patchRecord, putRecord, softDeleteRecord } from './records';

export function createNote(input: {
  title?: string;
  body: string;
  source?: string;
  tags?: string[];
  bookId?: string;
}): Promise<Note> {
  return putRecord(
    'notes',
    newRecord<Note>({
      ...(input.title ? { title: input.title } : {}),
      body: input.body,
      ...(input.source ? { source: input.source } : {}),
      tags: input.tags ?? [],
      ...(input.bookId ? { bookId: input.bookId } : {}),
    }),
  );
}

export const updateNote = (id: string, patch: Partial<Note>) =>
  patchRecord<Note>('notes', id, patch);

export const deleteNote = (id: string) => softDeleteRecord<Note>('notes', id);
