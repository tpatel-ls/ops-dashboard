'use client';

import { localDay } from '@ops-dashboard/core';
import type { JournalEntry } from '@ops-dashboard/core';
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
  const body = input.body.trim();
  if (!body) throw new Error('Journal entry body is required.');
  const date = input.date ?? todayISO();
  if (localDay(date) !== date) throw new Error('Journal entry date must be valid.');
  const title = input.title?.trim();

  return putRecord(
    'journalEntries',
    newRecord<JournalEntry>({
      date,
      ...(title ? { title } : {}),
      body,
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
