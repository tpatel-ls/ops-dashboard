import type {
  AppNotification,
  Book,
  Capture,
  ChecklistTemplate,
  Content,
  Domain,
  FoodLog,
  JournalEntry,
  Note,
  Organization,
  Person,
  Project,
  Quote,
  Routine,
  RoutineCheck,
  Task,
  Whiteboard,
  WorkLog,
} from './types';

export interface SyncEnvelope {
  tasks: Task[];
  projects: Project[];
  whiteboards: Whiteboard[];
  cursor: string;
}

export type Syncable =
  | Task
  | Project
  | Organization
  | Whiteboard
  | Domain
  | Routine
  | RoutineCheck
  | Capture
  | JournalEntry
  | WorkLog
  | Content
  | AppNotification
  | ChecklistTemplate
  | Person
  | Note
  | Quote
  | Book
  | FoodLog;

export function pickWinner<T extends Syncable>(local: T | undefined, remote: T): T {
  if (!local) return remote;
  if (local.version > remote.version) return local;
  if (remote.version > local.version) return remote;
  if (remote.updatedAt > local.updatedAt) return remote;
  if (local.updatedAt > remote.updatedAt) return local;

  // Equal version/timestamp conflicts must converge regardless of which copy is
  // considered local. Preserve deletions first, then use the stable device ID.
  if (Boolean(remote.deletedAt) !== Boolean(local.deletedAt)) {
    return remote.deletedAt ? remote : local;
  }
  return remote.deviceId > local.deviceId ? remote : local;
}

export function bumpVersion<T extends Syncable>(rec: T): T {
  return { ...rec, version: rec.version + 1, updatedAt: new Date().toISOString() };
}

export function isTombstone<T extends Syncable>(rec: T): boolean {
  return Boolean(rec.deletedAt);
}
