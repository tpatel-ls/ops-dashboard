import { addDays, addMonths, addWeeks, addYears, isValid, parseISO } from 'date-fns';
import type { RecurrenceRule, Task } from './types';
import { isoDay } from './dates';

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
  const interval = Number.isFinite(rule.interval) ? Math.max(1, Math.floor(rule.interval)) : 1;
  if (rule.freq === 'daily') return addDays(from, interval);
  if (rule.freq === 'monthly') return addMonths(from, interval);
  if (rule.freq === 'yearly') return addYears(from, interval);
  if (rule.freq === 'weekly') {
    if (!rule.byDay || rule.byDay.length === 0) return addWeeks(from, interval);
    const allowed = [...new Set(rule.byDay.map((d) => DAY_INDEX[d]))].sort((a, b) => a - b);
    const laterThisWeek = allowed.find((day) => day > from.getDay());
    if (laterThisWeek !== undefined) {
      return addDays(from, laterThisWeek - from.getDay());
    }
    const firstAllowed = allowed[0];
    if (firstAllowed === undefined) return addWeeks(from, interval);
    return addDays(from, interval * 7 - from.getDay() + firstAllowed);
  }
  return from;
}

export function shouldGenerateNext(rule: RecurrenceRule, count: number, next: Date): boolean {
  if (rule.endsOn) {
    // endsOn is a local calendar day, so a timed occurrence later on that day
    // is still eligible.
    if (isoDay(next) > rule.endsOn.slice(0, 10)) return false;
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
      : task.dueAt
        ? parseISO(task.dueAt)
        : now;
  if (!isValid(anchor) || !isValid(now)) return null;
  const next = nextOccurrence(task.recurrence, anchor);
  if (!isValid(next)) return null;
  if (!shouldGenerateNext(task.recurrence, 1, next)) return null;
  const isoDate = isoDay(next);
  const parsedStartAt = task.startAt ? parseISO(task.startAt) : undefined;
  const startAtSource = parsedStartAt && isValid(parsedStartAt) ? parsedStartAt : undefined;
  const parsedEndAt = task.endAt ? parseISO(task.endAt) : undefined;
  const offsetMs =
    startAtSource && parsedEndAt && isValid(parsedEndAt)
      ? parsedEndAt.getTime() - startAtSource.getTime()
      : 0;
  const nextStart = new Date(next);
  if (startAtSource) {
    nextStart.setHours(
      startAtSource.getHours(),
      startAtSource.getMinutes(),
      startAtSource.getSeconds(),
      startAtSource.getMilliseconds(),
    );
  }
  const startAt = startAtSource ? nextStart.toISOString() : undefined;
  const endAt =
    startAt && offsetMs > 0
      ? new Date(parseISO(startAt).getTime() + offsetMs).toISOString()
      : undefined;
  const parsedDueAt = task.dueAt ? parseISO(task.dueAt) : undefined;
  const dueAtSource = parsedDueAt && isValid(parsedDueAt) ? parsedDueAt : undefined;
  const nextDue = new Date(next);
  if (dueAtSource) {
    nextDue.setHours(
      dueAtSource.getHours(),
      dueAtSource.getMinutes(),
      dueAtSource.getSeconds(),
      dueAtSource.getMilliseconds(),
    );
  }
  const dueAt = dueAtSource ? nextDue.toISOString() : undefined;
  const nowIso = now.toISOString();
  const recurrence =
    task.recurrence.count === undefined
      ? task.recurrence
      : { ...task.recurrence, count: task.recurrence.count - 1 };
  const projected: Task = {
    ...task,
    id: '',
    status: 'todo',
    scheduledFor: isoDate,
    recurrence,
    createdAt: nowIso,
    updatedAt: nowIso,
    version: 1,
  };
  delete projected.completedAt;
  if (startAt) projected.startAt = startAt;
  else delete projected.startAt;
  if (endAt) projected.endAt = endAt;
  else delete projected.endAt;
  if (dueAt) projected.dueAt = dueAt;
  else delete projected.dueAt;
  return projected;
}
