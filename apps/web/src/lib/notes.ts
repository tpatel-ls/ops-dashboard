'use client';

import type { Note } from '@ops-dashboard/core';
import { newRecord, patchRecord, putRecord, softDeleteRecord } from './records';

function normalizeNotePatch(patch: Partial<Note>): Partial<Note> {
  const normalized = { ...patch };
  if (normalized.title !== undefined) normalized.title = normalized.title.trim() || undefined;
  if (Object.hasOwn(normalized, 'body')) {
    if (typeof normalized.body !== 'string') throw new Error('Note body must be valid.');
    normalized.body = normalized.body.trim();
  }
  if (normalized.title === undefined && normalized.body === '' && patch.title !== undefined) {
    throw new Error('Note content is required.');
  }
  for (const key of ['source', 'imageUrl', 'bookId'] as const) {
    if (normalized[key] !== undefined) normalized[key] = normalized[key]?.trim() || undefined;
  }
  if (Object.hasOwn(normalized, 'tags')) {
    if (!normalized.tags) throw new Error('Note tags must be valid.');
    normalized.tags = [...new Set(normalized.tags.map((tag) => tag.trim()).filter(Boolean))];
  }
  return normalized;
}

export function createNote(input: {
  title?: string;
  body: string;
  source?: string;
  tags?: string[];
  bookId?: string;
}): Promise<Note> {
  const fields = normalizeNotePatch({
    title: input.title,
    body: input.body,
    source: input.source,
    tags: input.tags ?? [],
    bookId: input.bookId,
  });
  if (!fields.title && !fields.body) throw new Error('Note content is required.');

  return putRecord(
    'notes',
    newRecord<Note>({
      ...(fields.title ? { title: fields.title } : {}),
      body: fields.body!,
      ...(fields.source ? { source: fields.source } : {}),
      tags: fields.tags!,
      ...(fields.bookId ? { bookId: fields.bookId } : {}),
    }),
  );
}

export const updateNote = (id: string, patch: Partial<Note>) =>
  patchRecord<Note>('notes', id, normalizeNotePatch(patch));

export const deleteNote = (id: string) => softDeleteRecord<Note>('notes', id);
