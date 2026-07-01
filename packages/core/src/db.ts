import Dexie, { type EntityTable } from 'dexie';
import type {
  AppNotification,
  Book,
  Capture,
  ChecklistTemplate,
  Content,
  Domain,
  JournalEntry,
  Note,
  Organization,
  Person,
  Project,
  Quote,
  Reminder,
  Routine,
  RoutineCheck,
  Settings,
  SyncOp,
  Task,
  Whiteboard,
  WorkLog,
} from './types';

export class OpsDB extends Dexie {
  tasks!: EntityTable<Task, 'id'>;
  projects!: EntityTable<Project, 'id'>;
  organizations!: EntityTable<Organization, 'id'>;
  whiteboards!: EntityTable<Whiteboard, 'id'>;
  reminders!: EntityTable<Reminder, 'id'>;
  settings!: EntityTable<Settings, 'id'>;
  syncOps!: EntityTable<SyncOp, 'id'>;
  domains!: EntityTable<Domain, 'id'>;
  routines!: EntityTable<Routine, 'id'>;
  routineChecks!: EntityTable<RoutineCheck, 'id'>;
  captures!: EntityTable<Capture, 'id'>;
  journalEntries!: EntityTable<JournalEntry, 'id'>;
  workLogs!: EntityTable<WorkLog, 'id'>;
  content!: EntityTable<Content, 'id'>;
  notifications!: EntityTable<AppNotification, 'id'>;
  checklistTemplates!: EntityTable<ChecklistTemplate, 'id'>;
  people!: EntityTable<Person, 'id'>;
  notes!: EntityTable<Note, 'id'>;
  quotes!: EntityTable<Quote, 'id'>;
  books!: EntityTable<Book, 'id'>;

  constructor(name = 'ops-dashboard') {
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
    // v2 — Ops Dashboard entities. Boolean fields (starred, done, notify) are
    // intentionally NOT indexed: IndexedDB keys can't be booleans.
    this.version(2).stores({
      tasks:
        'id, status, priority, scheduledFor, dueAt, projectId, parentId, domainId, contentId, updatedAt, deletedAt, *tags',
      projects: 'id, name, kind, status, domainId, archivedAt, lastWorkedAt, updatedAt, deletedAt',
      domains: 'id, name, order, archivedAt, updatedAt, deletedAt',
      routines: 'id, timeOfDay, kind, domainId, order, archivedAt, updatedAt, deletedAt',
      routineChecks: 'id, routineId, date, updatedAt, deletedAt, [routineId+date]',
      captures: 'id, status, source, createdAt, updatedAt, deletedAt',
      journalEntries: 'id, date, updatedAt, deletedAt, *tags',
      workLogs: 'id, projectId, at, updatedAt, deletedAt',
      content: 'id, type, status, domainId, order, updatedAt, deletedAt',
      notifications: 'id, kind, readAt, createdAt, updatedAt, deletedAt',
      checklistTemplates: 'id, name, kind, updatedAt, deletedAt',
    });
    // v3 — index `order` on tasks (addTask + recurrence use orderBy('order');
    // Dexie throws on orderBy over an unindexed key).
    this.version(3).stores({
      tasks:
        'id, status, priority, scheduledFor, dueAt, projectId, parentId, domainId, contentId, order, updatedAt, deletedAt, *tags',
    });
    // v4 — People CRM + Library (notes, quotes, books).
    this.version(4).stores({
      people: 'id, name, domainId, updatedAt, deletedAt, *tags',
      notes: 'id, bookId, updatedAt, deletedAt, *tags',
      quotes: 'id, bookId, author, updatedAt, deletedAt, *tags',
      books: 'id, status, author, updatedAt, deletedAt, *tags',
    });
    // v5 — Organizations (work lanes) + orgId on tasks/projects.
    this.version(5).stores({
      organizations: 'id, name, order, archivedAt, updatedAt, deletedAt',
      tasks:
        'id, status, priority, scheduledFor, dueAt, projectId, parentId, domainId, contentId, orgId, order, updatedAt, deletedAt, *tags',
      projects:
        'id, name, kind, status, domainId, orgId, archivedAt, lastWorkedAt, updatedAt, deletedAt',
    });
  }
}

let _db: OpsDB | null = null;

export function getDb(): OpsDB {
  if (!_db) _db = new OpsDB();
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
  aiEnabled: true,
  captureAutoReminder: true,
  slippingDays: 5,
};
