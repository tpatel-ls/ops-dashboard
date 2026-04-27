import type { Project, Task, Whiteboard } from './types';

export interface SyncEnvelope {
  tasks: Task[];
  projects: Project[];
  whiteboards: Whiteboard[];
  cursor: string;
}

export type Syncable = Task | Project | Whiteboard;

export function pickWinner<T extends Syncable>(local: T | undefined, remote: T): T {
  if (!local) return remote;
  if (local.version > remote.version) return local;
  if (remote.version > local.version) return remote;
  return remote.updatedAt >= local.updatedAt ? remote : local;
}

export function bumpVersion<T extends Syncable>(rec: T): T {
  return { ...rec, version: rec.version + 1, updatedAt: new Date().toISOString() };
}

export function isTombstone<T extends Syncable>(rec: T): boolean {
  return Boolean(rec.deletedAt);
}
