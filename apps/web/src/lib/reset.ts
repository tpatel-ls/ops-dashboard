'use client';

import { getDb } from '@ops-dashboard/core';
import type { SyncTable } from '@ops-dashboard/core';

const TABLES: SyncTable[] = [
  'tasks',
  'projects',
  'organizations',
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
  'foodLogs',
];

/** Clear every record from local storage (keeps Settings). Used by the one-time
 *  demo-data reset and the Settings "Clear all data" action. */
export async function wipeLocalData(): Promise<void> {
  const db = getDb();
  const contentTables = TABLES.map((table) => db.table(table));
  await db.transaction('rw', [...contentTables, db.syncOps], async () => {
    await Promise.all(contentTables.map((table) => table.clear()));
    await db.syncOps.clear();
  });
}
