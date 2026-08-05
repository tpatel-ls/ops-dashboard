'use client';

import type { Book, BookStatus } from '@ops-dashboard/core';
import { newRecord, patchRecord, putRecord, softDeleteRecord } from './records';

export function createBook(input: {
  title: string;
  author?: string;
  status?: BookStatus;
  coverUrl?: string;
  isbn?: string;
}): Promise<Book> {
  const title = input.title.trim();
  if (!title) throw new Error('Book title is required.');

  return putRecord(
    'books',
    newRecord<Book>({
      title,
      ...(input.author ? { author: input.author } : {}),
      status: input.status ?? 'want',
      ...(input.coverUrl ? { coverUrl: input.coverUrl } : {}),
      ...(input.isbn ? { isbn: input.isbn } : {}),
      tags: [],
    }),
  );
}

export const updateBook = (id: string, patch: Partial<Book>) =>
  patchRecord<Book>('books', id, patch);

export const deleteBook = (id: string) => softDeleteRecord<Book>('books', id);
