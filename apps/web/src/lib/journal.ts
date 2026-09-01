'use client';

import { localDay } from '@ops-dashboard/core';
import type { JournalEntry } from '@ops-dashboard/core';
import { newRecord, patchRecord, putRecord, softDeleteRecord } from './records';
import { todayISO } from './routines';
import { normalizeStringList } from './string-list';

const JOURNAL_SOURCES = new Set<NonNullable<JournalEntry['source']>>(['voice', 'text', 'upload']);
const MAX_JOURNAL_BODY_LENGTH = 50_000;
const MAX_JOURNAL_TITLE_LENGTH = 500;
const MAX_JOURNAL_MOOD_LENGTH = 100;

export function compareJournalEntries(
  left: Pick<JournalEntry, 'id' | 'date' | 'createdAt'>,
  right: Pick<JournalEntry, 'id' | 'date' | 'createdAt'>,
): number {
  const leftDate = localDay(left.date) === left.date ? left.date : undefined;
  const rightDate = localDay(right.date) === right.date ? right.date : undefined;
  if (leftDate && rightDate && leftDate !== rightDate) return rightDate.localeCompare(leftDate);
  if (Boolean(leftDate) !== Boolean(rightDate)) return leftDate ? -1 : 1;

  const leftCreated = Date.parse(left.createdAt);
  const rightCreated = Date.parse(right.createdAt);
  const leftCreatedValid = Number.isFinite(leftCreated);
  const rightCreatedValid = Number.isFinite(rightCreated);
  if (leftCreatedValid && rightCreatedValid && leftCreated !== rightCreated) {
    return rightCreated - leftCreated;
  }
  if (leftCreatedValid !== rightCreatedValid) return leftCreatedValid ? -1 : 1;
  return left.id.localeCompare(right.id);
}

function normalizeJournalPatch(patch: Partial<JournalEntry>): Partial<JournalEntry> {
  const normalized = { ...patch };
  if (Object.hasOwn(normalized, 'body')) {
    if (typeof normalized.body !== 'string') throw new Error('Journal entry body is required.');
    normalized.body = normalized.body.trim();
    if (!normalized.body) throw new Error('Journal entry body is required.');
    if (Array.from(normalized.body).length > MAX_JOURNAL_BODY_LENGTH) {
      throw new Error('Journal entry body must contain at most 50000 characters.');
    }
  }
  if (Object.hasOwn(normalized, 'date')) {
    if (typeof normalized.date !== 'string' || localDay(normalized.date) !== normalized.date) {
      throw new Error('Journal entry date must be valid.');
    }
  }
  if (normalized.source !== undefined && !JOURNAL_SOURCES.has(normalized.source)) {
    throw new Error('Journal entry source must be valid.');
  }
  if (normalized.title !== undefined) {
    normalized.title = normalized.title.trim() || undefined;
    if (normalized.title && Array.from(normalized.title).length > MAX_JOURNAL_TITLE_LENGTH) {
      throw new Error('Journal entry title must contain at most 500 characters.');
    }
  }
  if (normalized.mood !== undefined) {
    normalized.mood = normalized.mood.trim() || undefined;
    if (normalized.mood && Array.from(normalized.mood).length > MAX_JOURNAL_MOOD_LENGTH) {
      throw new Error('Journal entry mood must contain at most 100 characters.');
    }
  }
  if (Object.hasOwn(normalized, 'mediaUrls')) {
    normalized.mediaUrls = normalizeStringList(
      normalized.mediaUrls,
      'Journal entry media must be valid.',
      { maxItems: 20, maxItemLength: 2_048 },
    );
  }
  if (Object.hasOwn(normalized, 'tags')) {
    normalized.tags = normalizeStringList(normalized.tags, 'Journal entry tags must be valid.', {
      caseInsensitive: true,
      maxItems: 50,
      maxItemLength: 64,
    });
  }
  if (
    normalized.flaggedForReview !== undefined &&
    typeof normalized.flaggedForReview !== 'boolean'
  ) {
    throw new Error('Journal review state must be boolean.');
  }
  return normalized;
}

export function createJournalEntry(input: {
  date?: string;
  title?: string;
  body: string;
  mediaUrls?: string[];
  mood?: string;
  tags?: string[];
  source?: JournalEntry['source'];
}): Promise<JournalEntry> {
  const fields = normalizeJournalPatch({
    date: input.date ?? todayISO(),
    title: input.title,
    body: input.body,
    mediaUrls: input.mediaUrls ?? [],
    mood: input.mood,
    tags: input.tags ?? [],
    source: input.source,
  });

  return putRecord(
    'journalEntries',
    newRecord<JournalEntry>({
      date: fields.date!,
      ...(fields.title ? { title: fields.title } : {}),
      body: fields.body!,
      mediaUrls: fields.mediaUrls!,
      ...(fields.mood ? { mood: fields.mood } : {}),
      tags: fields.tags!,
      ...(fields.source ? { source: fields.source } : {}),
    }),
  );
}

export const updateJournalEntry = (id: string, patch: Partial<JournalEntry>) =>
  patchRecord<JournalEntry>('journalEntries', id, normalizeJournalPatch(patch));

export const deleteJournalEntry = (id: string) =>
  softDeleteRecord<JournalEntry>('journalEntries', id);
