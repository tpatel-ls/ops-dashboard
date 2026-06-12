'use client';

import { getDb } from '@ops-dashboard/core';
import type { SyncTable } from '@ops-dashboard/core';

const TABLES: SyncTable[] = [
  'tasks',
  'projects',
  'whiteboards',
  'reminders',
  'domains',
  'routines',
  'routineChecks',
  'captures',
  'journalEntries',
  'workLogs',
  'content',
  'notifications',
  'checklistTemplates',
  'people',
  'notes',
  'quotes',
  'books',
];

/** Clear every record from local storage (keeps Settings). Used by the one-time
 *  demo-data reset and the Settings "Clear all data" action. */
export async function wipeLocalData(): Promise<void> {
  const db = getDb();
  await Promise.all(TABLES.map((t) => db.table(t).clear()));
  await db.syncOps.clear();
}
