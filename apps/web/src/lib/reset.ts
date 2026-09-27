'use client';

import { getDb } from '@ops-dashboard/core';
import type { SyncTable } from '@ops-dashboard/core';

/**
 * Every content table, keyed so TypeScript checks the list is exhaustive.
 *
 * `SyncTable[]` accepts a subset just as happily as the full set, so a table
 * added to the union but forgotten here would survive "Clear all data" in
 * silence: the user asks to wipe the device and one table's records stay. As a
 * `Record<SyncTable, true>` a missing key is a compile error instead.
 */
const CONTENT_TABLES: Record<SyncTable, true> = {
  tasks: true,
  projects: true,
  organizations: true,
  whiteboards: true,
  reminders: true,
  domains: true,
  routines: true,
  routineChecks: true,
  captures: true,
  journalEntries: true,
  workLogs: true,
  content: true,
  notifications: true,
  checklistTemplates: true,
  people: true,
  notes: true,
  quotes: true,
  books: true,
  foodLogs: true,
};

export const TABLES = Object.keys(CONTENT_TABLES) as SyncTable[];

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
