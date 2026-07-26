import 'fake-indexeddb/auto';

import Dexie from 'dexie';
import { afterEach, describe, expect, test } from 'vitest';
import { OpsDB } from './db';

const openedDatabases: Dexie[] = [];
const databaseNames: string[] = [];

function legacyDatabase(name: string): Dexie {
  const db = new Dexie(name);
  db.version(6).stores({
    tasks:
      'id, status, priority, scheduledFor, dueAt, projectId, parentId, domainId, contentId, orgId, order, updatedAt, deletedAt, *tags',
    projects:
      'id, name, kind, status, domainId, orgId, archivedAt, lastWorkedAt, updatedAt, deletedAt',
    organizations: 'id, name, order, archivedAt, updatedAt, deletedAt',
    whiteboards: 'id, name, updatedAt, deletedAt',
    reminders: 'id, taskId, triggerAt, delivered',
    settings: 'id',
    syncOps: 'id, table, recordId, createdAt',
    domains: 'id, name, order, archivedAt, updatedAt, deletedAt',
    routines: 'id, timeOfDay, kind, domainId, order, archivedAt, updatedAt, deletedAt',
    routineChecks: 'id, routineId, date, updatedAt, deletedAt, [routineId+date]',
    captures: 'id, status, source, createdAt, updatedAt, deletedAt',
    journalEntries: 'id, date, updatedAt, deletedAt, *tags',
    workLogs: 'id, projectId, at, updatedAt, deletedAt',
    content: 'id, type, status, domainId, order, updatedAt, deletedAt',
    notifications: 'id, kind, readAt, createdAt, updatedAt, deletedAt',
    checklistTemplates: 'id, name, kind, updatedAt, deletedAt',
    people: 'id, name, domainId, updatedAt, deletedAt, *tags',
    notes: 'id, bookId, updatedAt, deletedAt, *tags',
    quotes: 'id, bookId, author, updatedAt, deletedAt, *tags',
    books: 'id, status, author, updatedAt, deletedAt, *tags',
    foodLogs: 'id, date, mealType, updatedAt, deletedAt',
  });
  return db;
}

afterEach(async () => {
  for (const db of openedDatabases.splice(0)) db.close();
  for (const name of databaseNames.splice(0)) await Dexie.delete(name);
});

describe('OpsDB data reset upgrade', () => {
  test('clears app content and queued sync operations while preserving settings', async () => {
    const name = `taskify-reset-${Date.now()}-${Math.random()}`;
    databaseNames.push(name);

    const legacy = legacyDatabase(name);
    openedDatabases.push(legacy);
    await legacy.open();
    await legacy.table('tasks').put({ id: 'task-1', status: 'todo' });
    await legacy.table('projects').put({ id: 'project-1', name: 'Old project' });
    await legacy.table('organizations').put({ id: 'org-1', name: 'Old organization' });
    await legacy.table('syncOps').put({
      id: 'sync-1',
      table: 'tasks',
      recordId: 'task-1',
      createdAt: '2026-07-25T00:00:00.000Z',
    });
    await legacy.table('settings').put({ id: 'singleton', theme: 'dark' });
    legacy.close();

    const upgraded = new OpsDB(name);
    openedDatabases.push(upgraded);
    await upgraded.open();

    await expect(upgraded.tasks.count()).resolves.toBe(0);
    await expect(upgraded.projects.count()).resolves.toBe(0);
    await expect(upgraded.organizations.count()).resolves.toBe(0);
    await expect(upgraded.syncOps.count()).resolves.toBe(0);
    await expect(upgraded.settings.get('singleton')).resolves.toMatchObject({
      id: 'singleton',
      theme: 'dark',
    });
  });
});
