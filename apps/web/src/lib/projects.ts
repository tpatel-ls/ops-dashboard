'use client';

import { getDb, getDeviceId, localDay, newId } from '@ops-dashboard/core';
import type { Project, ProjectKind, Task } from '@ops-dashboard/core';
import { enqueueOp } from './sync-queue';

export interface CreateProjectOptions {
  color?: string;
  kind?: ProjectKind;
  domainId?: string;
  orgId?: string;
  description?: string;
  dueDate?: string;
}

const DEFAULT_COLORS = [
  'oklch(0.7 0.16 150)',
  'oklch(0.72 0.16 60)',
  'oklch(0.65 0.18 280)',
  'oklch(0.7 0.18 30)',
  'oklch(0.62 0.16 200)',
  'oklch(0.68 0.18 350)',
];

const PROJECT_KINDS = new Set<ProjectKind>(['project', 'area', 'retainer']);

function normalizeProjectOptions(opts: CreateProjectOptions): CreateProjectOptions {
  const normalized = { ...opts };
  if (normalized.kind !== undefined && !PROJECT_KINDS.has(normalized.kind)) {
    throw new Error('Project kind must be valid.');
  }
  if (normalized.color !== undefined) {
    normalized.color = normalized.color.trim();
    if (!normalized.color) throw new Error('Project color is required.');
  }
  for (const key of ['domainId', 'orgId', 'description'] as const) {
    if (normalized[key] !== undefined) normalized[key] = normalized[key]?.trim() || undefined;
  }
  if (normalized.dueDate !== undefined) {
    normalized.dueDate = normalized.dueDate.trim();
    if (localDay(normalized.dueDate) !== normalized.dueDate) {
      throw new Error('Project due date must be a valid calendar date.');
    }
  }
  return normalized;
}

export interface ProjectTaskProgress {
  open: number;
  done: number;
  total: number;
  percent: number;
}

export function projectTaskProgress(tasks: Task[], projectId: string): ProjectTaskProgress {
  const live = tasks.filter(
    (task) => task.projectId === projectId && !task.deletedAt && task.status !== 'archived',
  );
  const done = live.filter((task) => task.status === 'done').length;
  const open = live.length - done;
  return {
    open,
    done,
    total: live.length,
    percent: live.length > 0 ? Math.round((done / live.length) * 100) : 0,
  };
}

export async function createProject(
  name: string,
  opts: CreateProjectOptions = {},
): Promise<Project> {
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error('Project name is required.');
  const fields = normalizeProjectOptions(opts);

  const db = getDb();
  const count = await db.projects.count();
  const now = new Date().toISOString();
  const project: Project = {
    id: newId(),
    name: normalizedName,
    color: fields.color ?? DEFAULT_COLORS[count % DEFAULT_COLORS.length] ?? DEFAULT_COLORS[0]!,
    kind: fields.kind ?? 'project',
    status: 'active',
    ...(fields.domainId ? { domainId: fields.domainId } : {}),
    ...(fields.orgId ? { orgId: fields.orgId } : {}),
    ...(fields.description ? { description: fields.description } : {}),
    ...(fields.dueDate ? { dueDate: fields.dueDate } : {}),
    milestones: [],
    checklists: [],
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
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error('Project name is required.');

  const db = getDb();
  const existing = await db.projects.get(id);
  if (!existing || existing.deletedAt) return;
  if (existing.name === normalizedName) return;
  const next: Project = {
    ...existing,
    name: normalizedName,
    updatedAt: new Date().toISOString(),
    version: existing.version + 1,
  };
  await db.projects.put(next);
  await enqueueOp({ table: 'projects', recordId: id, op: 'put', payload: next });
}

export async function archiveProject(id: string): Promise<void> {
  const db = getDb();
  const existing = await db.projects.get(id);
  if (!existing || existing.deletedAt || existing.archivedAt) return;
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
