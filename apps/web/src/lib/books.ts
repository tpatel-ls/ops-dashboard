'use client';

import type { Book, BookStatus } from '@ops-dashboard/core';
import { newRecord, patchRecord, putRecord, softDeleteRecord } from './records';

const BOOK_STATUSES = new Set<BookStatus>(['want', 'reading', 'finished', 'abandoned']);

function normalizeBookPatch(patch: Partial<Book>): Partial<Book> {
  const normalized = { ...patch };
  if (Object.hasOwn(normalized, 'title')) {
    if (typeof normalized.title !== 'string') throw new Error('Book title is required.');
    normalized.title = normalized.title.trim();
    if (!normalized.title) throw new Error('Book title is required.');
  }
  if (Object.hasOwn(normalized, 'status') && !BOOK_STATUSES.has(normalized.status!)) {
    throw new Error('Book status must be valid.');
  }
  if (
    normalized.rating !== undefined &&
    (!Number.isInteger(normalized.rating) || normalized.rating < 1 || normalized.rating > 5)
  ) {
    throw new Error('Book rating must be an integer from 1 to 5.');
  }
  for (const key of ['startedAt', 'finishedAt'] as const) {
    const value = normalized[key];
    if (value !== undefined && (!value.trim() || !Number.isFinite(Date.parse(value)))) {
      throw new Error(`Book ${key} must be a valid date.`);
    }
  }
  for (const key of ['author', 'coverUrl', 'format', 'isbn', 'summary'] as const) {
    if (normalized[key] !== undefined) normalized[key] = normalized[key]?.trim() || undefined;
  }
  if (Object.hasOwn(normalized, 'tags')) {
    if (!normalized.tags) throw new Error('Book tags must be valid.');
    normalized.tags = normalized.tags.map((tag) => tag.trim()).filter(Boolean);
  }
  return normalized;
}

export function createBook(input: {
  title: string;
  author?: string;
  status?: BookStatus;
  coverUrl?: string;
  isbn?: string;
}): Promise<Book> {
  const fields = normalizeBookPatch({
    title: input.title,
    author: input.author,
    status: input.status ?? 'want',
    coverUrl: input.coverUrl,
    isbn: input.isbn,
  });

  return putRecord(
    'books',
    newRecord<Book>({
      title: fields.title!,
      ...(fields.author ? { author: fields.author } : {}),
      status: fields.status!,
      ...(fields.coverUrl ? { coverUrl: fields.coverUrl } : {}),
      ...(fields.isbn ? { isbn: fields.isbn } : {}),
      tags: [],
    }),
  );
}

export const updateBook = (id: string, patch: Partial<Book>) =>
  patchRecord<Book>('books', id, normalizeBookPatch(patch));

export const deleteBook = (id: string) => softDeleteRecord<Book>('books', id);
