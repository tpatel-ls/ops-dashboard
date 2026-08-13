'use client';

import { localDay } from '@ops-dashboard/core';
import type { JournalEntry } from '@ops-dashboard/core';
import { newRecord, patchRecord, putRecord, softDeleteRecord } from './records';
import { todayISO } from './routines';

const JOURNAL_SOURCES = new Set<NonNullable<JournalEntry['source']>>(['voice', 'text', 'upload']);

function normalizeJournalPatch(patch: Partial<JournalEntry>): Partial<JournalEntry> {
  const normalized = { ...patch };
  if (Object.hasOwn(normalized, 'body')) {
    if (typeof normalized.body !== 'string') throw new Error('Journal entry body is required.');
    normalized.body = normalized.body.trim();
    if (!normalized.body) throw new Error('Journal entry body is required.');
  }
  if (Object.hasOwn(normalized, 'date')) {
    if (typeof normalized.date !== 'string' || localDay(normalized.date) !== normalized.date) {
      throw new Error('Journal entry date must be valid.');
    }
  }
  if (normalized.source !== undefined && !JOURNAL_SOURCES.has(normalized.source)) {
    throw new Error('Journal entry source must be valid.');
  }
  if (normalized.title !== undefined) normalized.title = normalized.title.trim() || undefined;
  if (normalized.mood !== undefined) normalized.mood = normalized.mood.trim() || undefined;
  if (Object.hasOwn(normalized, 'mediaUrls')) {
    if (!normalized.mediaUrls) throw new Error('Journal entry media must be valid.');
    normalized.mediaUrls = normalized.mediaUrls.map((url) => url.trim()).filter(Boolean);
  }
  if (Object.hasOwn(normalized, 'tags')) {
    if (!normalized.tags) throw new Error('Journal entry tags must be valid.');
    normalized.tags = [...new Set(normalized.tags.map((tag) => tag.trim()).filter(Boolean))];
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
