'use client';

import { format, isValid, parseISO } from 'date-fns';
import { getDb } from '@ops-dashboard/core';
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

  for (const key of ['tasks', 'projects', 'whiteboards'] as const) {
    const records = payload[key];
    if (!Array.isArray(records) || !records.every(isRecordWithId) || !hasUniqueIds(records)) {
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
