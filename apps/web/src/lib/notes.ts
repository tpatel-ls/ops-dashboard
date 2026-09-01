'use client';

import { getDb } from '@ops-dashboard/core';
import type { Note } from '@ops-dashboard/core';
import { newRecord, patchRecord, putRecord, softDeleteRecord } from './records';
import { normalizeStringList } from './string-list';

const MAX_NOTE_TITLE_LENGTH = 500;
const MAX_NOTE_BODY_LENGTH = 50_000;
const MAX_NOTE_SOURCE_LENGTH = 200;
const MAX_NOTE_IMAGE_URL_LENGTH = 2_048;
const MAX_NOTE_BOOK_ID_LENGTH = 128;

export function compareNoteRecency(
  left: Pick<Note, 'id' | 'createdAt'>,
  right: Pick<Note, 'id' | 'createdAt'>,
): number {
  const leftTimestamp = Date.parse(left.createdAt);
  const rightTimestamp = Date.parse(right.createdAt);
  const leftValid = Number.isFinite(leftTimestamp);
  const rightValid = Number.isFinite(rightTimestamp);
  if (leftValid && rightValid && leftTimestamp !== rightTimestamp) {
    return rightTimestamp - leftTimestamp;
  }
  if (leftValid !== rightValid) return leftValid ? -1 : 1;
  return left.id.localeCompare(right.id);
}

function normalizeNotePatch(patch: Partial<Note>): Partial<Note> {
  const normalized = { ...patch };
  if (normalized.title !== undefined) {
    normalized.title = normalized.title.trim() || undefined;
    if (normalized.title && Array.from(normalized.title).length > MAX_NOTE_TITLE_LENGTH) {
      throw new Error('Note title must contain at most 500 characters.');
    }
  }
  if (Object.hasOwn(normalized, 'body')) {
    if (typeof normalized.body !== 'string') throw new Error('Note body must be valid.');
    normalized.body = normalized.body.trim();
    if (Array.from(normalized.body).length > MAX_NOTE_BODY_LENGTH) {
      throw new Error('Note body must contain at most 50000 characters.');
    }
  }
  if (
    Object.hasOwn(normalized, 'title') &&
    Object.hasOwn(normalized, 'body') &&
    !normalized.title &&
    !normalized.body
  ) {
    throw new Error('Note content is required.');
  }
  for (const [key, limit] of [
    ['source', MAX_NOTE_SOURCE_LENGTH],
    ['imageUrl', MAX_NOTE_IMAGE_URL_LENGTH],
    ['bookId', MAX_NOTE_BOOK_ID_LENGTH],
  ] as const) {
    if (normalized[key] !== undefined) {
      normalized[key] = normalized[key]?.trim() || undefined;
      if (normalized[key] && Array.from(normalized[key]).length > limit) {
        throw new Error('Note metadata must be valid.');
      }
    }
  }
  if (Object.hasOwn(normalized, 'tags')) {
    normalized.tags = normalizeStringList(normalized.tags, 'Note tags must be valid.', {
      caseInsensitive: true,
      maxItems: 50,
      maxItemLength: 64,
    });
  }
  if (
    normalized.flaggedForReview !== undefined &&
    typeof normalized.flaggedForReview !== 'boolean'
  ) {
    throw new Error('Note review state must be boolean.');
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
