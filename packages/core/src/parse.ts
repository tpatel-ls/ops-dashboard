import * as chrono from 'chrono-node';
import type { Priority, Task } from './types';

export interface ParsedQuickAdd {
  title: string;
  scheduledFor?: string;
  startAt?: string;
  endAt?: string;
  dueAt?: string;
  tags: string[];
  priority: Priority;
}

const TAG_RE = /(?:^|\s)#([\w-]+)/g;
const PRIORITY_RE = /(?:^|\s)(!{1,3})(?=\s|$)/;

export function parseQuickAdd(input: string, now: Date = new Date()): ParsedQuickAdd {
  let working = input.trim();
  const tags: string[] = [];

  for (const match of working.matchAll(TAG_RE)) {
    if (match[1]) tags.push(match[1].toLowerCase());
  }
  working = working.replace(TAG_RE, ' ').trim();

  let priority: Priority = 0;
  const pMatch = working.match(PRIORITY_RE);
  if (pMatch && pMatch[1]) {
    priority = Math.min(3, pMatch[1].length) as Priority;
    working = working.replace(PRIORITY_RE, ' ').trim();
  }

  const results = chrono.parse(working, now, { forwardDate: true });
  let scheduledFor: string | undefined;
  let startAt: string | undefined;
  let endAt: string | undefined;
  let dueAt: string | undefined;

  if (results.length > 0) {
    const first = results[0];
    if (first) {
      const start = first.start.date();
      const end = first.end?.date();
      const hasTime = first.start.isCertain('hour');
      scheduledFor = toISODate(start);
      if (hasTime) {
        startAt = start.toISOString();
        if (end) endAt = end.toISOString();
        dueAt = start.toISOString();
      }
      working = (working.slice(0, first.index) + working.slice(first.index + first.text.length))
        .replace(/\s+/g, ' ')
        .trim();
    }
  }

  return {
    title: working || input.trim(),
    ...(scheduledFor !== undefined ? { scheduledFor } : {}),
    ...(startAt !== undefined ? { startAt } : {}),
    ...(endAt !== undefined ? { endAt } : {}),
    ...(dueAt !== undefined ? { dueAt } : {}),
    tags,
    priority,
  };
}

function toISODate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function quickAddToTask(
  parsed: ParsedQuickAdd,
  base: { id: string; deviceId: string; order: number },
): Task {
  const nowIso = new Date().toISOString();
  return {
    id: base.id,
    title: parsed.title,
    status: 'todo',
    priority: parsed.priority,
    ...(parsed.scheduledFor !== undefined ? { scheduledFor: parsed.scheduledFor } : {}),
    ...(parsed.startAt !== undefined ? { startAt: parsed.startAt } : {}),
    ...(parsed.endAt !== undefined ? { endAt: parsed.endAt } : {}),
    ...(parsed.dueAt !== undefined ? { dueAt: parsed.dueAt } : {}),
    tags: parsed.tags,
    order: base.order,
    reminders: [],
    checklist: [],
    createdAt: nowIso,
    updatedAt: nowIso,
    version: 1,
    deviceId: base.deviceId,
  };
}
