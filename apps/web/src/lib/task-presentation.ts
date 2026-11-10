import { localDay } from '@ops-dashboard/core';
import type { Task } from '@ops-dashboard/core';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { calendarInstant } from './calendar-agenda';

export function taskPlanningTimestamp(
  task: Pick<Task, 'startAt' | 'dueAt' | 'scheduledFor'>,
): number | undefined {
  for (const value of [task.startAt, task.dueAt, task.scheduledFor]) {
    if (!value) continue;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value) && localDay(value) !== value) continue;
    const timestamp = Date.parse(value);
    if (Number.isFinite(timestamp)) return timestamp;
  }
  return undefined;
}

export function taskResultSummary(count: number, filtered: boolean): string {
  if (count === 0) return filtered ? 'No matching tasks' : 'No tasks';
  const noun = count === 1 ? 'task' : 'tasks';
  return filtered ? `${count} matching ${noun}` : `${count} ${noun}`;
}

/**
 * Status shown beside a task in search results. Search is the one task list
 * that still includes archived tasks, so they need their own label instead of
 * reading as open, and a closed task's past date is not overdue.
 */
export function taskSearchStatus(status: Task['status']): { label: string; closed: boolean } {
  if (status === 'done') return { label: 'Done', closed: true };
  if (status === 'archived') return { label: 'Archived', closed: true };
  return { label: 'Open', closed: false };
}

export function taskDateLabel(date: string, today: string, done: boolean): string {
  if (localDay(date) !== date) return date;
  const parsed = parseISO(date);
  const calendarLabel = format(parsed, 'MMM d');
  if (localDay(today) !== today) return calendarLabel;

  const offset = differenceInCalendarDays(parsed, parseISO(today));
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tomorrow';
  if (!done && offset === -1) return 'Yesterday';

  return !done && offset < -1 ? `Overdue · ${calendarLabel}` : calendarLabel;
}

/**
 * `HH:mm` for a `type="time"` input bound to a task instant.
 *
 * Returns '' when the value is missing or does not parse. date-fns `format`
 * throws `RangeError: Invalid time value` on an Invalid Date, and `startAt` /
 * `endAt` reach Dexie through sync's `fromRow`, which casts without
 * validating. Formatting one inline took the whole edit drawer down.
 */
export function taskClockTime(value: string | undefined): string {
  const instant = calendarInstant(value);
  return instant ? format(instant, 'HH:mm') : '';
}

/**
 * Patch for a new start clock time from the drawer. Moving the start to or past
 * the current end would fail the time-range check, so the end moves with it and
 * keeps the block's previous length. Without this, rescheduling a 09:00-10:00
 * block to 14:00 meant editing the end first.
 */
export function taskStartTimePatch(
  task: Pick<Task, 'startAt' | 'endAt'>,
  day: string,
  clock: string,
): Pick<Task, 'startAt'> | Pick<Task, 'startAt' | 'endAt'> {
  if (!clock) return { startAt: undefined };
  const start = new Date(`${day}T${clock}:00`);
  const startAt = start.toISOString();
  const end = calendarInstant(task.endAt);
  const previousStart = calendarInstant(task.startAt);
  if (!end || end.getTime() > start.getTime() || !previousStart) return { startAt };
  const length = end.getTime() - previousStart.getTime();
  if (length <= 0) return { startAt };
  return { startAt, endAt: new Date(start.getTime() + length).toISOString() };
}

/** Reminder trigger label, or a stated fallback when the instant is unreadable. */
export function taskReminderLabel(value: string | undefined): string {
  const instant = calendarInstant(value);
  return instant ? format(instant, 'EEE d MMM HH:mm') : 'Time unavailable';
}
