'use client';

import { getDb } from '@ops-dashboard/core';
import type { Note } from '@ops-dashboard/core';
import { newRecord, patchRecord, putRecord, softDeleteRecord } from './records';
import { normalizeStringList } from './string-list';

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
    normalized.tags = normalizeStringList(normalized.tags, 'Note tags must be valid.');
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

export function updateNote(id: string, patch: Partial<Note>) {
  const fields = normalizeNotePatch(patch);
  const changesTitle = Object.hasOwn(fields, 'title');
  const changesBody = Object.hasOwn(fields, 'body');
  if (!changesTitle && !changesBody) return patchRecord<Note>('notes', id, fields);
  if (changesTitle && changesBody) return patchRecord<Note>('notes', id, fields);
  return updateNoteContent(id, fields);
}

async function updateNoteContent(id: string, fields: Partial<Note>) {
  const existing = await getDb().notes.get(id);
  if (!existing || existing.deletedAt) return null;
  const title = Object.hasOwn(fields, 'title') ? fields.title : existing.title;
  const body = Object.hasOwn(fields, 'body') ? fields.body : existing.body;
  if (!title && !body) throw new Error('Note content is required.');
  return patchRecord<Note>('notes', id, fields);
}

export const deleteNote = (id: string) => softDeleteRecord<Note>('notes', id);
