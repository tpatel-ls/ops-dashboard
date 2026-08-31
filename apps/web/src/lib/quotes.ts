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
const MAX_QUOTE_TEXT_LENGTH = 8_000;
const MAX_QUOTE_THOUGHTS = 100;
const MAX_QUOTE_THOUGHT_TEXT_LENGTH = 2_000;
const MAX_QUOTE_THOUGHT_ID_LENGTH = 128;

export function compareQuoteRecency(
  left: Pick<Quote, 'id' | 'createdAt'>,
  right: Pick<Quote, 'id' | 'createdAt'>,
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

function normalizeQuotePatch(patch: Partial<Quote>): Partial<Quote> {
  const normalized = { ...patch };
  if (Object.hasOwn(normalized, 'text')) {
    if (typeof normalized.text !== 'string') throw new Error('Quote text is required.');
    normalized.text = normalized.text.trim();
    if (!normalized.text) throw new Error('Quote text is required.');
    if (Array.from(normalized.text).length > MAX_QUOTE_TEXT_LENGTH) {
      throw new Error('Quote text must contain at most 8000 characters.');
    }
  }
  if (normalized.sourceType !== undefined && !QUOTE_SOURCE_TYPES.has(normalized.sourceType)) {
    throw new Error('Quote source type must be valid.');
  }
  for (const key of ['author', 'source', 'bookId'] as const) {
    if (normalized[key] !== undefined) normalized[key] = normalized[key]?.trim() || undefined;
  }
  if (Object.hasOwn(normalized, 'tags')) {
    normalized.tags = normalizeStringList(normalized.tags, 'Quote tags must be valid.', {
      caseInsensitive: true,
    });
  }
  if (Object.hasOwn(normalized, 'thoughts')) {
    if (!Array.isArray(normalized.thoughts)) throw new Error('Quote thoughts must be valid.');
    if (normalized.thoughts.length > MAX_QUOTE_THOUGHTS) {
      throw new Error('Quote thoughts must contain at most 100 entries.');
    }
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
      if (
        !id ||
        !text ||
        Array.from(id).length > MAX_QUOTE_THOUGHT_ID_LENGTH ||
        Array.from(text).length > MAX_QUOTE_THOUGHT_TEXT_LENGTH ||
        !Number.isFinite(Date.parse(thought.at)) ||
        seen.has(id)
      ) {
        throw new Error('Quote thoughts must be valid.');
      }
      seen.add(id);
      return { ...thought, id, text, at: new Date(Date.parse(thought.at)).toISOString() };
    });
  }
  if (normalized.favorite !== undefined && typeof normalized.favorite !== 'boolean') {
    throw new Error('Quote favorite state must be boolean.');
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
  if (Array.from(normalizedText).length > MAX_QUOTE_THOUGHT_TEXT_LENGTH) {
    throw new Error('Thought text must contain at most 2000 characters.');
  }
  return { id: newId(), text: normalizedText, at: new Date().toISOString() };
}
