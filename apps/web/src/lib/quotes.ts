'use client';

import { newId } from '@ops-dashboard/core';
import type { Quote, QuoteSourceType, Thought } from '@ops-dashboard/core';
import { newRecord, patchRecord, putRecord, softDeleteRecord } from './records';
import { normalizeStringList } from './string-list';

const QUOTE_SOURCE_TYPES = new Set<QuoteSourceType>([
  'book',
  'article',
  'podcast',
  'conversation',
  'other',
]);

function normalizeQuotePatch(patch: Partial<Quote>): Partial<Quote> {
  const normalized = { ...patch };
  if (Object.hasOwn(normalized, 'text')) {
    if (typeof normalized.text !== 'string') throw new Error('Quote text is required.');
    normalized.text = normalized.text.trim();
    if (!normalized.text) throw new Error('Quote text is required.');
  }
  if (normalized.sourceType !== undefined && !QUOTE_SOURCE_TYPES.has(normalized.sourceType)) {
    throw new Error('Quote source type must be valid.');
  }
  for (const key of ['author', 'source', 'bookId'] as const) {
    if (normalized[key] !== undefined) normalized[key] = normalized[key]?.trim() || undefined;
  }
  if (Object.hasOwn(normalized, 'tags')) {
    normalized.tags = normalizeStringList(normalized.tags, 'Quote tags must be valid.');
  }
  if (Object.hasOwn(normalized, 'thoughts')) {
    if (!Array.isArray(normalized.thoughts)) throw new Error('Quote thoughts must be valid.');
    const seen = new Set<string>();
    normalized.thoughts = normalized.thoughts.map((thought) => {
      if (
        !thought ||
        typeof thought !== 'object' ||
        typeof thought.id !== 'string' ||
        typeof thought.text !== 'string' ||
        typeof thought.at !== 'string'
      ) {
        throw new Error('Quote thoughts must be valid.');
      }
      const text = thought.text.trim();
      const id = thought.id.trim();
      if (!id || !text || !Number.isFinite(Date.parse(thought.at)) || seen.has(id)) {
        throw new Error('Quote thoughts must be valid.');
      }
      seen.add(id);
      return { ...thought, id, text, at: new Date(Date.parse(thought.at)).toISOString() };
    });
  }
  return normalized;
}

export function createQuote(input: {
  text: string;
  author?: string;
  source?: string;
  sourceType?: QuoteSourceType;
  bookId?: string;
  tags?: string[];
}): Promise<Quote> {
  const fields = normalizeQuotePatch({
    text: input.text,
    author: input.author,
    source: input.source,
    sourceType: input.sourceType,
    bookId: input.bookId,
    tags: input.tags ?? [],
  });

  return putRecord(
    'quotes',
    newRecord<Quote>({
      text: fields.text!,
      ...(fields.author ? { author: fields.author } : {}),
      ...(fields.source ? { source: fields.source } : {}),
      ...(fields.sourceType ? { sourceType: fields.sourceType } : {}),
      ...(fields.bookId ? { bookId: fields.bookId } : {}),
      thoughts: [],
      tags: fields.tags!,
    }),
  );
}

export const updateQuote = (id: string, patch: Partial<Quote>) =>
  patchRecord<Quote>('quotes', id, normalizeQuotePatch(patch));

export const deleteQuote = (id: string) => softDeleteRecord<Quote>('quotes', id);

export function makeThought(text: string): Thought {
  const normalizedText = text.trim();
  if (!normalizedText) throw new Error('Thought text is required.');
  return { id: newId(), text: normalizedText, at: new Date().toISOString() };
}
