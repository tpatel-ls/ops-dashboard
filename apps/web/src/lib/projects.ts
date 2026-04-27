'use client';

import { getDb, getDeviceId, newId } from '@drift/core';
import type { Project } from '@drift/core';
import { enqueueOp } from './sync-queue';

const DEFAULT_COLORS = [
  'oklch(0.7 0.16 150)',
  'oklch(0.72 0.16 60)',
  'oklch(0.65 0.18 280)',
  'oklch(0.7 0.18 30)',
  'oklch(0.62 0.16 200)',
  'oklch(0.68 0.18 350)',
];

export async function createProject(name: string, color?: string): Promise<Project> {
  const db = getDb();
  const count = await db.projects.count();
  const now = new Date().toISOString();
  const project: Project = {
    id: newId(),
    name,
    color: color ?? DEFAULT_COLORS[count % DEFAULT_COLORS.length] ?? DEFAULT_COLORS[0]!,
    createdAt: now,
    updatedAt: now,
    version: 1,
    deviceId: getDeviceId(),
  };
  await db.projects.put(project);
  await enqueueOp({ table: 'projects', recordId: project.id, op: 'put', payload: project });
  return project;
}

export async function renameProject(id: string, name: string): Promise<void> {
  const db = getDb();
  const existing = await db.projects.get(id);
  if (!existing) return;
  const next: Project = {
    ...existing,
    name,
    updatedAt: new Date().toISOString(),
    version: existing.version + 1,
  };
  await db.projects.put(next);
  await enqueueOp({ table: 'projects', recordId: id, op: 'put', payload: next });
}

export async function archiveProject(id: string): Promise<void> {
  const db = getDb();
  const existing = await db.projects.get(id);
  if (!existing) return;
  const now = new Date().toISOString();
  const next: Project = {
    ...existing,
    archivedAt: now,
    updatedAt: now,
    version: existing.version + 1,
  };
  await db.projects.put(next);
  await enqueueOp({ table: 'projects', recordId: id, op: 'put', payload: next });
}
