'use client';

import type { Book, BookStatus } from '@drift/core';
import { newRecord, patchRecord, putRecord, softDeleteRecord } from './records';

export function createBook(input: {
  title: string;
  author?: string;
  status?: BookStatus;
  coverUrl?: string;
  isbn?: string;
}): Promise<Book> {
  return putRecord(
    'books',
    newRecord<Book>({
      title: input.title,
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
