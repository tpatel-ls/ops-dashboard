'use client';

import { bumpVersion, getDb, getDeviceId, localDay, newId } from '@ops-dashboard/core';
import type { Project, ProjectKind, Task } from '@ops-dashboard/core';
import { patchRecord } from './records';
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
const PROJECT_STATUSES = new Set<Project['status']>(['active', 'paused', 'done', 'archived']);

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

function normalizeProjectPatch(patch: Partial<Project>): Partial<Project> {
  const normalized = { ...patch };
  if (Object.hasOwn(normalized, 'name')) {
    if (typeof normalized.name !== 'string' || !normalized.name.trim()) {
      throw new Error('Project name is required.');
    }
    normalized.name = normalized.name.trim();
  }
  if (normalized.kind !== undefined && !PROJECT_KINDS.has(normalized.kind)) {
    throw new Error('Project kind must be valid.');
  }
  if (normalized.status !== undefined && !PROJECT_STATUSES.has(normalized.status)) {
    throw new Error('Project status must be valid.');
  }
  if (Object.hasOwn(normalized, 'color')) {
    if (typeof normalized.color !== 'string' || !normalized.color.trim()) {
      throw new Error('Project color is required.');
    }
    normalized.color = normalized.color.trim();
  }
  for (const key of ['icon', 'domainId', 'orgId', 'description'] as const) {
    if (normalized[key] !== undefined) normalized[key] = normalized[key]?.trim() || undefined;
  }
  for (const key of ['startDate', 'dueDate'] as const) {
    if (normalized[key] !== undefined && localDay(normalized[key]) !== normalized[key]) {
      throw new Error(`Project ${key} must be a valid calendar date.`);
    }
  }
  if (
    normalized.lastWorkedAt !== undefined &&
    (!normalized.lastWorkedAt.trim() || !Number.isFinite(Date.parse(normalized.lastWorkedAt)))
  ) {
    throw new Error('Project last worked time must be valid.');
  }
  if (normalized.lastWorkedAt !== undefined) {
    normalized.lastWorkedAt = new Date(Date.parse(normalized.lastWorkedAt)).toISOString();
  }
  if (
    normalized.retainerResetDay !== undefined &&
    (!Number.isInteger(normalized.retainerResetDay) ||
      normalized.retainerResetDay < 1 ||
      normalized.retainerResetDay > 28)
  ) {
    throw new Error('Project retainer reset day must be from 1 to 28.');
  }
  if (Object.hasOwn(normalized, 'milestones')) {
    if (!Array.isArray(normalized.milestones)) {
      throw new Error('Project milestones must be valid.');
    }
    const seen = new Set<string>();
    normalized.milestones = normalized.milestones.map((milestone) => {
      if (
        !milestone ||
        typeof milestone !== 'object' ||
        typeof milestone.id !== 'string' ||
        typeof milestone.title !== 'string' ||
        typeof milestone.done !== 'boolean'
      ) {
        throw new Error('Project milestones must be valid.');
      }
      const id = milestone.id.trim();
      const title = milestone.title.trim();
      if (
        !id ||
        !title ||
        seen.has(id) ||
        (milestone.dueAt !== undefined && localDay(milestone.dueAt) !== milestone.dueAt)
      ) {
        throw new Error('Project milestones must be valid.');
      }
      seen.add(id);
      return {
        id,
        title,
        done: milestone.done,
        ...(milestone.dueAt ? { dueAt: milestone.dueAt } : {}),
      };
    });
  }
  if (Object.hasOwn(normalized, 'checklists')) {
    if (!Array.isArray(normalized.checklists)) {
      throw new Error('Project checklists must be valid.');
    }
    const seenLists = new Set<string>();
    normalized.checklists = normalized.checklists.map((checklist) => {
      if (
        !checklist ||
        typeof checklist !== 'object' ||
        typeof checklist.id !== 'string' ||
        typeof checklist.name !== 'string' ||
        !Array.isArray(checklist.items)
      ) {
        throw new Error('Project checklists must be valid.');
      }
      const id = checklist.id.trim();
      const name = checklist.name.trim();
      if (!id || !name || seenLists.has(id)) {
        throw new Error('Project checklists must be valid.');
      }
      seenLists.add(id);
      const seenItems = new Set<string>();
      const items = checklist.items.map((item) => {
        if (
          !item ||
          typeof item !== 'object' ||
          typeof item.id !== 'string' ||
          typeof item.text !== 'string' ||
          typeof item.done !== 'boolean'
        ) {
          throw new Error('Project checklists must be valid.');
        }
        const itemId = item.id.trim();
        const text = item.text.trim();
        if (!itemId || !text || seenItems.has(itemId)) {
          throw new Error('Project checklists must be valid.');
        }
        seenItems.add(itemId);
        return { id: itemId, text, done: item.done };
      });
      return { id, name, items };
    });
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
  const next = bumpVersion<Project>({
    ...existing,
    name: normalizedName,
  });
  await db.projects.put(next);
  await enqueueOp({ table: 'projects', recordId: id, op: 'put', payload: next });
}

function assertProjectDateRange(project: Pick<Project, 'startDate' | 'dueDate'>): void {
  if (project.startDate && project.dueDate && project.dueDate < project.startDate) {
    throw new Error('Project due date must not precede its start date.');
  }
}

export function updateProject(id: string, patch: Partial<Project>) {
  const fields = normalizeProjectPatch(patch);
  if (!Object.hasOwn(fields, 'startDate') && !Object.hasOwn(fields, 'dueDate')) {
    return patchRecord<Project>('projects', id, fields);
  }
  return updateProjectDates(id, fields);
}

async function updateProjectDates(id: string, fields: Partial<Project>) {
  const existing = await getDb().projects.get(id);
  if (!existing || existing.deletedAt) return null;
  assertProjectDateRange({ ...existing, ...fields });
  return patchRecord<Project>('projects', id, fields);
}

export async function archiveProject(id: string): Promise<void> {
  const db = getDb();
  const existing = await db.projects.get(id);
  if (!existing || existing.deletedAt || existing.archivedAt) return;
  const now = new Date().toISOString();
  const next = bumpVersion<Project>({
    ...existing,
    archivedAt: now,
  });
  await db.projects.put(next);
  await enqueueOp({ table: 'projects', recordId: id, op: 'put', payload: next });
}
