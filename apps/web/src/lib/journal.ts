'use client';

import type { JournalEntry } from '@drift/core';
import { newRecord, patchRecord, putRecord, softDeleteRecord } from './records';
import { todayISO } from './routines';

export function createJournalEntry(input: {
  date?: string;
  title?: string;
  body: string;
  mediaUrls?: string[];
  mood?: string;
  tags?: string[];
  source?: JournalEntry['source'];
}): Promise<JournalEntry> {
  return putRecord(
    'journalEntries',
    newRecord<JournalEntry>({
      date: input.date ?? todayISO(),
      ...(input.title ? { title: input.title } : {}),
      body: input.body,
      mediaUrls: input.mediaUrls ?? [],
      ...(input.mood ? { mood: input.mood } : {}),
      tags: input.tags ?? [],
      ...(input.source ? { source: input.source } : {}),
    }),
  );
}

export const updateJournalEntry = (id: string, patch: Partial<JournalEntry>) =>
  patchRecord<JournalEntry>('journalEntries', id, patch);

export const deleteJournalEntry = (id: string) =>
  softDeleteRecord<JournalEntry>('journalEntries', id);
