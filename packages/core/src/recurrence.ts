import { addDays, addMonths, addWeeks, addYears, parseISO } from 'date-fns';
import type { RecurrenceRule, Task } from './types';

const DAY_INDEX: Record<NonNullable<RecurrenceRule['byDay']>[number], number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

export function nextOccurrence(rule: RecurrenceRule, from: Date): Date {
  const interval = Math.max(1, rule.interval);
  if (rule.freq === 'daily') return addDays(from, interval);
  if (rule.freq === 'monthly') return addMonths(from, interval);
  if (rule.freq === 'yearly') return addYears(from, interval);
  if (rule.freq === 'weekly') {
    if (!rule.byDay || rule.byDay.length === 0) return addWeeks(from, interval);
    const allowed = rule.byDay.map((d) => DAY_INDEX[d]).sort((a, b) => a - b);
    let candidate = addDays(from, 1);
    for (let i = 0; i < 7 * interval; i += 1) {
      if (allowed.includes(candidate.getDay())) return candidate;
      candidate = addDays(candidate, 1);
    }
    return addWeeks(from, interval);
  }
  return from;
}

export function shouldGenerateNext(rule: RecurrenceRule, count: number, next: Date): boolean {
  if (rule.endsOn) {
    const end = parseISO(rule.endsOn);
    if (next > end) return false;
  }
  if (rule.count !== undefined && count >= rule.count) return false;
  return true;
}

export function projectNextTask(task: Task, now: Date = new Date()): Task | null {
  if (!task.recurrence) return null;
  const anchor = task.scheduledFor
    ? parseISO(`${task.scheduledFor}T00:00:00`)
    : task.startAt
      ? parseISO(task.startAt)
      : now;
  const next = nextOccurrence(task.recurrence, anchor);
  if (!shouldGenerateNext(task.recurrence, 1, next)) return null;
  const isoDate = next.toISOString().slice(0, 10);
  const offsetMs = task.startAt && task.endAt ? parseISO(task.endAt).getTime() - parseISO(task.startAt).getTime() : 0;
  const startAt = task.startAt
    ? new Date(next.getTime() + (parseISO(task.startAt).getHours() * 60 + parseISO(task.startAt).getMinutes()) * 60000 - (anchor.getHours() * 60 + anchor.getMinutes()) * 60000).toISOString()
    : undefined;
  const endAt = startAt && offsetMs > 0 ? new Date(parseISO(startAt).getTime() + offsetMs).toISOString() : undefined;
  const nowIso = now.toISOString();
  const projected: Task = {
    ...task,
    id: '',
    status: 'todo',
    scheduledFor: isoDate,
    createdAt: nowIso,
    updatedAt: nowIso,
    version: 1,
  };
  delete projected.completedAt;
  if (startAt) projected.startAt = startAt;
  else delete projected.startAt;
  if (endAt) projected.endAt = endAt;
  else delete projected.endAt;
  return projected;
}
