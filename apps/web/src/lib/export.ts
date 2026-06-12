'use client';

import { format, parseISO } from 'date-fns';
import { getDb } from '@ops-dashboard/core';
import type { Project, Task, Whiteboard } from '@ops-dashboard/core';

export interface OpsExport {
  version: 1;
  exportedAt: string;
  tasks: Task[];
  projects: Project[];
  whiteboards: Whiteboard[];
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

export async function importAll(payload: OpsExport): Promise<void> {
  if (payload.version !== 1) throw new Error('Unsupported export version');
  const db = getDb();
  await db.transaction('rw', db.tasks, db.projects, db.whiteboards, async () => {
    if (payload.projects) await db.projects.bulkPut(payload.projects);
    if (payload.tasks) await db.tasks.bulkPut(payload.tasks);
    if (payload.whiteboards) await db.whiteboards.bulkPut(payload.whiteboards);
  });
}

export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function tasksToMarkdown(tasks: Task[], heading: string): string {
  const lines: string[] = [`# ${heading}`, ''];
  const grouped: Record<string, Task[]> = {};
  for (const t of tasks) {
    const k = t.scheduledFor ?? 'unscheduled';
    grouped[k] = grouped[k] ?? [];
    grouped[k].push(t);
  }
  for (const day of Object.keys(grouped).sort()) {
    const list = grouped[day]!;
    const label = day === 'unscheduled' ? 'Unscheduled' : format(parseISO(`${day}T00:00:00`), 'EEEE, MMMM d');
    lines.push(`## ${label}`, '');
    for (const t of list) {
      const box = t.status === 'done' ? '[x]' : '[ ]';
      const tags = t.tags.length ? ` ${t.tags.map((x) => `#${x}`).join(' ')}` : '';
      lines.push(`- ${box} ${t.title}${tags}`);
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
  URL.revokeObjectURL(url);
}
