'use client';

import type { Note } from '@ops-dashboard/core';
import { newRecord, patchRecord, putRecord, softDeleteRecord } from './records';

export function createNote(input: {
  title?: string;
  body: string;
  source?: string;
  tags?: string[];
  bookId?: string;
}): Promise<Note> {
  const title = input.title?.trim();
  const body = input.body.trim();
  if (!title && !body) throw new Error('Note content is required.');

  return putRecord(
    'notes',
    newRecord<Note>({
      ...(title ? { title } : {}),
      body,
      ...(input.source ? { source: input.source } : {}),
      tags: input.tags ?? [],
      ...(input.bookId ? { bookId: input.bookId } : {}),
    }),
  );
}

export const updateNote = (id: string, patch: Partial<Note>) =>
  patchRecord<Note>('notes', id, patch);

export const deleteNote = (id: string) => softDeleteRecord<Note>('notes', id);
