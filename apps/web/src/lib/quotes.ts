'use client';

import { newId } from '@ops-dashboard/core';
import type { Quote, QuoteSourceType, Thought } from '@ops-dashboard/core';
import { newRecord, patchRecord, putRecord, softDeleteRecord } from './records';

export function createQuote(input: {
  text: string;
  author?: string;
  source?: string;
  sourceType?: QuoteSourceType;
  bookId?: string;
  tags?: string[];
}): Promise<Quote> {
  return putRecord(
    'quotes',
    newRecord<Quote>({
      text: input.text,
      ...(input.author ? { author: input.author } : {}),
      ...(input.source ? { source: input.source } : {}),
      ...(input.sourceType ? { sourceType: input.sourceType } : {}),
      ...(input.bookId ? { bookId: input.bookId } : {}),
      thoughts: [],
      tags: input.tags ?? [],
    }),
  );
}

export const updateQuote = (id: string, patch: Partial<Quote>) =>
  patchRecord<Quote>('quotes', id, patch);

export const deleteQuote = (id: string) => softDeleteRecord<Quote>('quotes', id);

export function makeThought(text: string): Thought {
  return { id: newId(), text, at: new Date().toISOString() };
}
