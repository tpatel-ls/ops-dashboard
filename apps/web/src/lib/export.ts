'use client';

import { format, isValid, parseISO } from 'date-fns';
import { getDb, localDay } from '@ops-dashboard/core';
import type { Project, Task, Whiteboard } from '@ops-dashboard/core';

export interface OpsExport {
  version: 1;
  exportedAt: string;
  tasks: Task[];
  projects: Project[];
  whiteboards: Whiteboard[];
}

function isRecordWithId(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const id = (value as { id?: unknown }).id;
  return typeof id === 'string' && Boolean(id) && id === id.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUsableString(value: unknown): value is string {
  return typeof value === 'string' && Boolean(value.trim()) && value === value.trim();
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Boolean(value) && Number.isFinite(Date.parse(value));
}

function hasValidSyncMetadata(value: Record<string, unknown>): boolean {
  return (
    isRecordWithId(value) &&
    isTimestamp(value.createdAt) &&
    isTimestamp(value.updatedAt) &&
    Number.isSafeInteger(value.version) &&
    (value.version as number) >= 0 &&
    isUsableString(value.deviceId) &&
    (value.deletedAt === undefined || isTimestamp(value.deletedAt))
  );
}

function isStringList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every(isUsableString) &&
    new Set(value).size === value.length
  );
}

function isOptionalUsableString(value: unknown): boolean {
  return value === undefined || isUsableString(value);
}

function isOptionalTimestamp(value: unknown): boolean {
  return value === undefined || isTimestamp(value);
}

function isOptionalCalendarDay(value: unknown): boolean {
  return value === undefined || (typeof value === 'string' && localDay(value) === value);
}

function isOptionalNonNegativeInteger(value: unknown): boolean {
  return value === undefined || (Number.isSafeInteger(value) && (value as number) >= 0);
}

const RECURRENCE_FREQUENCIES = new Set(['daily', 'weekly', 'monthly', 'yearly']);
const RECURRENCE_DAYS = new Set(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']);

function isRecurrence(value: unknown): boolean {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;
  return (
    typeof value.freq === 'string' &&
    RECURRENCE_FREQUENCIES.has(value.freq) &&
    Number.isSafeInteger(value.interval) &&
    (value.interval as number) >= 1 &&
    (value.byDay === undefined ||
      (Array.isArray(value.byDay) &&
        value.byDay.every((day) => typeof day === 'string' && RECURRENCE_DAYS.has(day)) &&
        new Set(value.byDay).size === value.byDay.length)) &&
    isOptionalCalendarDay(value.endsOn) &&
    (value.count === undefined ||
      (Number.isSafeInteger(value.count) && (value.count as number) >= 1))
  );
}

function isChecklistItem(value: unknown): boolean {
  return (
    isRecord(value) &&
    isUsableString(value.id) &&
    isUsableString(value.text) &&
    typeof value.done === 'boolean'
  );
}

function isReminder(value: unknown): boolean {
  return (
    isRecord(value) &&
    isUsableString(value.id) &&
    isUsableString(value.taskId) &&
    isTimestamp(value.triggerAt) &&
    typeof value.delivered === 'boolean' &&
    (value.offsetMinutes === undefined || Number.isSafeInteger(value.offsetMinutes))
  );
}

const TASK_STATUSES = new Set(['backlog', 'todo', 'doing', 'blocked', 'done', 'archived']);

function isTaskRecord(value: unknown): boolean {
  if (!isRecord(value) || !hasValidSyncMetadata(value)) return false;
  return (
    isUsableString(value.title) &&
    typeof value.status === 'string' &&
    TASK_STATUSES.has(value.status) &&
    Number.isInteger(value.priority) &&
    (value.priority as number) >= 0 &&
    (value.priority as number) <= 3 &&
    Number.isFinite(value.order) &&
    isStringList(value.tags) &&
    isOptionalUsableString(value.notes) &&
    isOptionalCalendarDay(value.scheduledFor) &&
    isOptionalTimestamp(value.dueAt) &&
    isOptionalTimestamp(value.startAt) &&
    isOptionalTimestamp(value.endAt) &&
    isOptionalTimestamp(value.completedAt) &&
    isOptionalNonNegativeInteger(value.estimateMinutes) &&
    isOptionalNonNegativeInteger(value.actualMinutes) &&
    isOptionalUsableString(value.projectId) &&
    isOptionalUsableString(value.orgId) &&
    isOptionalUsableString(value.domainId) &&
    isOptionalUsableString(value.contentId) &&
    isOptionalUsableString(value.parentId) &&
    (value.starred === undefined || typeof value.starred === 'boolean') &&
    isRecurrence(value.recurrence) &&
    Array.isArray(value.reminders) &&
    value.reminders.every(isReminder) &&
    value.reminders.every((reminder) => reminder.taskId === value.id) &&
    hasUniqueIds(value.reminders) &&
    Array.isArray(value.checklist) &&
    value.checklist.every(isChecklistItem) &&
    hasUniqueIds(value.checklist)
  );
}

const PROJECT_KINDS = new Set(['project', 'area', 'retainer']);
const PROJECT_STATUSES = new Set(['active', 'paused', 'done', 'archived']);

function isMilestone(value: unknown): boolean {
  return (
    isRecord(value) &&
    isUsableString(value.id) &&
    isUsableString(value.title) &&
    typeof value.done === 'boolean' &&
    (value.dueAt === undefined || isTimestamp(value.dueAt))
  );
}

function isNamedChecklist(value: unknown): boolean {
  return (
    isRecord(value) &&
    isUsableString(value.id) &&
    isUsableString(value.name) &&
    Array.isArray(value.items) &&
    value.items.every(isChecklistItem)
  );
}

function isProjectRecord(value: unknown): boolean {
  if (!isRecord(value) || !hasValidSyncMetadata(value)) return false;
  return (
    isUsableString(value.name) &&
    typeof value.color === 'string' &&
    typeof value.kind === 'string' &&
    PROJECT_KINDS.has(value.kind) &&
    typeof value.status === 'string' &&
    PROJECT_STATUSES.has(value.status) &&
    isOptionalUsableString(value.icon) &&
    isOptionalUsableString(value.orgId) &&
    isOptionalUsableString(value.domainId) &&
    isOptionalUsableString(value.description) &&
    isOptionalCalendarDay(value.startDate) &&
    isOptionalCalendarDay(value.dueDate) &&
    isOptionalTimestamp(value.lastWorkedAt) &&
    isOptionalTimestamp(value.archivedAt) &&
    (value.retainerResetDay === undefined ||
      (Number.isSafeInteger(value.retainerResetDay) &&
        (value.retainerResetDay as number) >= 1 &&
        (value.retainerResetDay as number) <= 28)) &&
    Array.isArray(value.milestones) &&
    value.milestones.every(isMilestone) &&
    hasUniqueIds(value.milestones) &&
    Array.isArray(value.checklists) &&
    value.checklists.every(isNamedChecklist) &&
    hasUniqueIds(value.checklists)
  );
}

function isWhiteboardRecord(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasValidSyncMetadata(value) &&
    isUsableString(value.name) &&
    isStringList(value.linkedTaskIds)
  );
}

function hasUniqueIds(records: unknown[]): boolean {
  const ids = records.map((record) => (record as { id: string }).id);
  return new Set(ids).size === ids.length;
}

export function validateOpsExport(value: unknown): OpsExport {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Invalid export payload');
  }
  const payload = value as Partial<OpsExport>;
  if (payload.version !== 1) throw new Error('Unsupported export version');
  if (
    typeof payload.exportedAt !== 'string' ||
    !payload.exportedAt ||
    !Number.isFinite(Date.parse(payload.exportedAt))
  ) {
    throw new Error('Invalid export timestamp');
  }

  const validators = {
    tasks: isTaskRecord,
    projects: isProjectRecord,
    whiteboards: isWhiteboardRecord,
  } as const;
  for (const key of ['tasks', 'projects', 'whiteboards'] as const) {
    const records = payload[key];
    if (!Array.isArray(records) || !records.every(validators[key]) || !hasUniqueIds(records)) {
      throw new Error(`Invalid export ${key}`);
    }
  }

  return payload as OpsExport;
}

export async function exportAll(): Promise<OpsExport> {
  const db = getDb();
  const [tasks, projects, whiteboards] = await Promise.all([
    db.tasks.toArray(),
    db.projects.toArray(),
    db.whiteboards.toArray(),
  ]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    tasks,
    projects,
    whiteboards,
  };
}

export async function importAll(value: unknown): Promise<void> {
  const payload = validateOpsExport(value);
  const db = getDb();
  await db.transaction('rw', db.tasks, db.projects, db.whiteboards, async () => {
    if (payload.projects) await db.projects.bulkPut(payload.projects);
    if (payload.tasks) await db.tasks.bulkPut(payload.tasks);
    if (payload.whiteboards) await db.whiteboards.bulkPut(payload.whiteboards);
  });
}

export function releaseDownloadUrl(url: string): void {
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  releaseDownloadUrl(url);
}

function markdownInline(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function markdownTag(value: string): string {
  return markdownInline(value).replace(/\s/g, '-');
}

export function tasksToMarkdown(tasks: Task[], heading: string): string {
  const lines: string[] = [`# ${heading}`, ''];
  const grouped: Record<string, Task[]> = {};
  for (const t of tasks) {
    if (t.deletedAt || t.status === 'archived') continue;
    const parsedDay = t.scheduledFor ? parseISO(t.scheduledFor) : null;
    const k = parsedDay && isValid(parsedDay) ? t.scheduledFor! : 'unscheduled';
    grouped[k] = grouped[k] ?? [];
    grouped[k].push(t);
  }
  for (const day of Object.keys(grouped).sort()) {
    const list = grouped[day]!;
    const label =
      day === 'unscheduled' ? 'Unscheduled' : format(parseISO(`${day}T00:00:00`), 'EEEE, MMMM d');
    lines.push(`## ${label}`, '');
    for (const t of list) {
      const box = t.status === 'done' ? '[x]' : '[ ]';
      const tags = t.tags.length ? ` ${t.tags.map((x) => `#${markdownTag(x)}`).join(' ')}` : '';
      lines.push(`- ${box} ${markdownInline(t.title)}${tags}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

export function downloadText(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  releaseDownloadUrl(url);
}
