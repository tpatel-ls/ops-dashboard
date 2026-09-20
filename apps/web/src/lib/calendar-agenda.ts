import { isoDay, localDay } from '@ops-dashboard/core';
import type { Task } from '@ops-dashboard/core';

export type CalendarTaskKind = 'time-block' | 'scheduled' | 'due';

function validTimestamp(value: string | undefined): number | undefined {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value) && localDay(value) !== value) return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

export function calendarInstant(value: string | undefined): Date | undefined {
  const timestamp = validTimestamp(value);
  return timestamp === undefined ? undefined : new Date(timestamp);
}

export function calendarKindOf(
  task: Pick<Task, 'startAt' | 'scheduledFor' | 'dueAt'>,
): CalendarTaskKind | undefined {
  if (calendarInstant(task.startAt)) return 'time-block';
  if (task.scheduledFor && localDay(task.scheduledFor) === task.scheduledFor) return 'scheduled';
  if (validTimestamp(task.dueAt) !== undefined) return 'due';
  return undefined;
}

/**
 * Calendar day for one task field. A date-only value is already a local
 * calendar day and must be kept verbatim: `new Date('2026-07-20')` is midnight
 * UTC, which `isoDay` renders as the previous day everywhere west of UTC.
 */
function calendarDay(value: string): string | undefined {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return localDay(value) === value ? value : undefined;
  }
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? isoDay(parsed) : undefined;
}

export function calendarDateOf(
  task: Pick<Task, 'startAt' | 'scheduledFor' | 'dueAt'>,
): string | undefined {
  if (task.startAt) {
    const start = calendarDay(task.startAt);
    if (start) return start;
  }
  if (task.scheduledFor) {
    const scheduled = localDay(task.scheduledFor);
    if (scheduled) return scheduled;
  }
  if (task.dueAt) {
    return calendarDay(task.dueAt);
  }
  return undefined;
}

export function compareCalendarTasks(a: Task, b: Task): number {
  const aStart = validTimestamp(a.startAt);
  const bStart = validTimestamp(b.startAt);
  // Decide "timed before untimed" before comparing two instants. Testing
  // `aStart !== undefined` after the equal-start case fell through returned -1
  // for both compare(a, b) and compare(b, a), so two tasks starting at the same
  // instant never reached the priority and title tie-break and their order
  // depended on where the sort happened to place them.
  if (aStart !== undefined && bStart === undefined) return -1;
  if (aStart === undefined && bStart !== undefined) return 1;
  if (aStart !== undefined && bStart !== undefined) {
    const startOrder = aStart - bStart;
    if (startOrder !== 0) return startOrder;
  }
  if (a.priority !== b.priority) return b.priority - a.priority;
  const titleOrder = a.title.localeCompare(b.title);
  return titleOrder !== 0 ? titleOrder : a.id.localeCompare(b.id);
}
