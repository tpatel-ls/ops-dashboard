'use client';

import { getDb } from '@ops-dashboard/core';
import type { Book, BookStatus } from '@ops-dashboard/core';
import { newRecord, patchRecord, putRecord, softDeleteRecord } from './records';
import { normalizeStringList } from './string-list';

const BOOK_STATUSES = new Set<BookStatus>(['want', 'reading', 'finished', 'abandoned']);
const MAX_BOOK_TITLE_LENGTH = 500;
const MAX_BOOK_AUTHOR_LENGTH = 500;
const MAX_BOOK_COVER_URL_LENGTH = 2_048;
const MAX_BOOK_FORMAT_LENGTH = 100;
const MAX_BOOK_ISBN_LENGTH = 64;
const MAX_BOOK_SUMMARY_LENGTH = 50_000;

export function compareBookRecency(
  left: Pick<Book, 'id' | 'createdAt'>,
  right: Pick<Book, 'id' | 'createdAt'>,
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

function normalizeBookPatch(patch: Partial<Book>): Partial<Book> {
  const normalized = { ...patch };
  if (Object.hasOwn(normalized, 'title')) {
    if (typeof normalized.title !== 'string') throw new Error('Book title is required.');
    normalized.title = normalized.title.trim();
    if (!normalized.title) throw new Error('Book title is required.');
    if (Array.from(normalized.title).length > MAX_BOOK_TITLE_LENGTH) {
      throw new Error('Book title must contain at most 500 characters.');
    }
  }
  if (Object.hasOwn(normalized, 'status') && !BOOK_STATUSES.has(normalized.status!)) {
    throw new Error('Book status must be valid.');
  }
  if (Object.hasOwn(normalized, 'rating')) {
    if (normalized.rating === 0) normalized.rating = undefined;
    if (
      normalized.rating !== undefined &&
      (!Number.isInteger(normalized.rating) || normalized.rating < 1 || normalized.rating > 5)
    ) {
      throw new Error('Book rating must be an integer from 1 to 5.');
    }
  }
  for (const key of ['startedAt', 'finishedAt'] as const) {
    const value = normalized[key];
    if (value !== undefined && (!value.trim() || !Number.isFinite(Date.parse(value)))) {
      throw new Error(`Book ${key} must be a valid date.`);
    }
    if (value !== undefined) normalized[key] = new Date(Date.parse(value)).toISOString();
  }
  for (const [key, limit] of [
    ['author', MAX_BOOK_AUTHOR_LENGTH],
    ['coverUrl', MAX_BOOK_COVER_URL_LENGTH],
    ['format', MAX_BOOK_FORMAT_LENGTH],
    ['isbn', MAX_BOOK_ISBN_LENGTH],
    ['summary', MAX_BOOK_SUMMARY_LENGTH],
  ] as const) {
    if (normalized[key] !== undefined) {
      normalized[key] = normalized[key]?.trim() || undefined;
      if (normalized[key] && Array.from(normalized[key]).length > limit) {
        throw new Error('Book metadata must be valid.');
      }
    }
  }
  if (Object.hasOwn(normalized, 'tags')) {
    normalized.tags = normalizeStringList(normalized.tags, 'Book tags must be valid.', {
      caseInsensitive: true,
      maxItems: 50,
      maxItemLength: 64,
    });
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

function assertReadingTimeline(book: Pick<Book, 'startedAt' | 'finishedAt'>): void {
  if (
    book.startedAt &&
    book.finishedAt &&
    Date.parse(book.finishedAt) < Date.parse(book.startedAt)
  ) {
    throw new Error('Book finish date must not precede its start date.');
  }
}

export function updateBook(id: string, patch: Partial<Book>) {
  const fields = normalizeBookPatch(patch);
  const changesStart = Object.hasOwn(fields, 'startedAt');
  const changesFinish = Object.hasOwn(fields, 'finishedAt');
  if (!changesStart && !changesFinish) return patchRecord<Book>('books', id, fields);
  if (changesStart && changesFinish) {
    assertReadingTimeline(fields);
    return patchRecord<Book>('books', id, fields);
  }
  return updateBookTimeline(id, fields);
}

async function updateBookTimeline(id: string, fields: Partial<Book>) {
  const existing = await getDb().books.get(id);
  if (!existing || existing.deletedAt) return null;
  assertReadingTimeline({ ...existing, ...fields });
  return patchRecord<Book>('books', id, fields);
}

export const deleteBook = (id: string) => softDeleteRecord<Book>('books', id);
