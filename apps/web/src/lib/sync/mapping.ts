import type { SyncTable, Syncable } from '@drift/core';

/**
 * Central column/table mapping between the camelCase TS/Dexie world and the
 * snake_case Postgres world. The DB stores snake_case; the app reads camelCase.
 *
 * Dexie store name (camelCase) -> Supabase table name (snake_case). Tables that
 * have no Supabase counterpart (e.g. `reminders`, which is embedded as jsonb on
 * tasks) are intentionally absent and never synced.
 */
export const SYNC_TABLES = {
  tasks: 'tasks',
  projects: 'projects',
  whiteboards: 'whiteboards',
  domains: 'domains',
  routines: 'routines',
  routineChecks: 'routine_checks',
  captures: 'captures',
  journalEntries: 'journal_entries',
  workLogs: 'work_logs',
  content: 'content',
  notifications: 'notifications',
  checklistTemplates: 'checklist_templates',
  people: 'people',
  notes: 'notes',
  quotes: 'quotes',
  books: 'books',
} as const satisfies Partial<Record<SyncTable, string>>;

export type DexieTableName = keyof typeof SYNC_TABLES;

export const DEXIE_TABLES = Object.keys(SYNC_TABLES) as DexieTableName[];

export function isSyncedTable(t: string): t is DexieTableName {
  return Object.prototype.hasOwnProperty.call(SYNC_TABLES, t);
}

const camelToSnake = (k: string): string => k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
const snakeToCamel = (k: string): string => k.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

/**
 * Local record -> DB row. SHALLOW key transform only: jsonb columns (reminders,
 * checklist, milestones, routedTo, …) keep their camelCase inner keys, which the
 * app reads back verbatim. Recursing would corrupt them. Drops `undefined`
 * (JSON would anyway) and injects the owning user_id.
 */
export function toRow(rec: object, userId: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rec)) {
    if (v === undefined) continue;
    out[camelToSnake(k)] = v;
  }
  out.user_id = userId;
  return out;
}

/**
 * DB row -> local record. Strips `user_id` and drops nulls so the shape matches
 * a locally-created record (optional fields absent, not null).
 */
export function fromRow(row: Record<string, unknown>): Syncable {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === 'user_id') continue;
    if (v === null) continue;
    out[snakeToCamel(k)] = v;
  }
  return out as unknown as Syncable;
}
