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
  SyncMeta,
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

function validVersion(value: number): number | undefined {
  return Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function canonicalSyncValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return 'number:NaN';
    if (value === Number.POSITIVE_INFINITY) return 'number:Infinity';
    if (value === Number.NEGATIVE_INFINITY) return 'number:-Infinity';
    if (Object.is(value, -0)) return 'number:-0';
    return `number:${value}`;
  }
  if (typeof value !== 'object') return `${typeof value}:${JSON.stringify(value) ?? String(value)}`;
  if (Array.isArray(value)) return `[${value.map(canonicalSyncValue).join(',')}]`;
  return `{${Object.entries(value)
    .filter(([, entry]) => entry !== undefined)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalSyncValue(entry)}`)
    .join(',')}}`;
}

export function pickWinner<T extends Syncable>(local: T | undefined, remote: T): T {
  if (!local) return remote;
  const localVersion = validVersion(local.version);
  const remoteVersion = validVersion(remote.version);
  if (remoteVersion !== undefined && localVersion === undefined) return remote;
  if (localVersion !== undefined && remoteVersion === undefined) return local;
  if (localVersion !== undefined && remoteVersion !== undefined) {
    if (localVersion > remoteVersion) return local;
    if (remoteVersion > localVersion) return remote;
  }
  const localUpdatedAt = Date.parse(local.updatedAt);
  const remoteUpdatedAt = Date.parse(remote.updatedAt);
  const localTimestampValid = Number.isFinite(localUpdatedAt);
  const remoteTimestampValid = Number.isFinite(remoteUpdatedAt);
  if (remoteTimestampValid && !localTimestampValid) return remote;
  if (localTimestampValid && !remoteTimestampValid) return local;
  if (remoteTimestampValid && localTimestampValid) {
    if (remoteUpdatedAt > localUpdatedAt) return remote;
    if (localUpdatedAt > remoteUpdatedAt) return local;
  }

  // Equal version/timestamp conflicts must converge regardless of which copy is
  // considered local. Preserve deletions first, then use the stable device ID.
  if (Boolean(remote.deletedAt) !== Boolean(local.deletedAt)) {
    return remote.deletedAt ? remote : local;
  }
  if (remote.deviceId !== local.deviceId) {
    return remote.deviceId > local.deviceId ? remote : local;
  }

  // A restored backup or duplicated device ID can produce two different
  // records with identical metadata. Use the record content as a final stable
  // tie-break so both peers still select the same copy.
  return canonicalSyncValue(remote) > canonicalSyncValue(local) ? remote : local;
}

export function bumpVersion<T extends SyncMeta>(rec: T): T {
  const current = validVersion(rec.version);
  return {
    ...rec,
    version: current === Number.MAX_SAFE_INTEGER ? Number.MAX_SAFE_INTEGER : (current ?? 0) + 1,
    updatedAt: new Date().toISOString(),
  };
}

export function isTombstone<T extends Syncable>(rec: T): boolean {
  return Boolean(rec.deletedAt);
}
