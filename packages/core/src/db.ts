import Dexie, { type EntityTable } from 'dexie';
import type { Project, Reminder, Settings, SyncOp, Task, Whiteboard } from './types';

export class DriftDB extends Dexie {
  tasks!: EntityTable<Task, 'id'>;
  projects!: EntityTable<Project, 'id'>;
  whiteboards!: EntityTable<Whiteboard, 'id'>;
  reminders!: EntityTable<Reminder, 'id'>;
  settings!: EntityTable<Settings, 'id'>;
  syncOps!: EntityTable<SyncOp, 'id'>;

  constructor(name = 'drift') {
    super(name);
    this.version(1).stores({
      tasks:
        'id, status, priority, scheduledFor, dueAt, projectId, parentId, updatedAt, deletedAt, *tags',
      projects: 'id, name, archivedAt, updatedAt, deletedAt',
      whiteboards: 'id, name, updatedAt, deletedAt',
      reminders: 'id, taskId, triggerAt, delivered',
      settings: 'id',
      syncOps: 'id, table, recordId, createdAt',
    });
  }
}

let _db: DriftDB | null = null;

export function getDb(): DriftDB {
  if (!_db) _db = new DriftDB();
  return _db;
}

export const DEFAULT_SETTINGS: Omit<Settings, 'updatedAt'> = {
  id: 'singleton',
  workdayStart: '08:00',
  workdayEnd: '18:00',
  weekStartsOn: 1,
  theme: 'system',
  syncEnabled: false,
  defaultView: 'today',
  leftyMode: false,
  pomodoroFocusMinutes: 25,
  pomodoroBreakMinutes: 5,
  dailyReviewAt: '17:30',
};
