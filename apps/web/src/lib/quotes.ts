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
  const text = input.text.trim();
  if (!text) throw new Error('Quote text is required.');

  return putRecord(
    'quotes',
    newRecord<Quote>({
      text,
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
  const normalizedText = text.trim();
  if (!normalizedText) throw new Error('Thought text is required.');
  return { id: newId(), text: normalizedText, at: new Date().toISOString() };
}
