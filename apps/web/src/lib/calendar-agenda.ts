import { isoDay, localDay } from '@ops-dashboard/core';
import type { Task } from '@ops-dashboard/core';
import { compareText } from './compare-text';
import { safeTaskPriority } from './task-query';

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
  const priorityOrder = safeTaskPriority(b.priority) - safeTaskPriority(a.priority);
  if (priorityOrder !== 0) return priorityOrder;
  const titleOrder = compareText(a.title, b.title);
  return titleOrder !== 0 ? titleOrder : compareText(a.id, b.id);
}

/** First and last hour rows the desktop week grid draws. */
export const CALENDAR_START_HOUR = 6;
export const CALENDAR_END_HOUR = 23;

/**
 * Hour row and minute offset a time block is drawn at in the week grid.
 *
 * The grid only has rows from `CALENDAR_START_HOUR`, and each row drew the
 * blocks whose start hour equalled it, so a block starting before 06:00 (an
 * early workout, a red-eye flight) matched no row and vanished from the
 * desktop week while the mobile agenda still listed it. Such a block now pins
 * to the top of the first row; it still prints its real start time.
 */
export function calendarGridSlot(start: Date): { hour: number; minute: number } {
  const hour = start.getHours();
  if (hour < CALENDAR_START_HOUR) return { hour: CALENDAR_START_HOUR, minute: 0 };
  return { hour: Math.min(hour, CALENDAR_END_HOUR), minute: start.getMinutes() };
}

/**
 * Minutes of grid height a time block covers, measured from where it is drawn.
 *
 * A block that starts before `CALENDAR_START_HOUR` is pinned to the top of the
 * first row, but its height used to be its full duration, so a 05:00 to 07:00
 * block was drawn as 06:00 to 08:00. Measuring from the pinned start keeps the
 * bottom edge at the real end. Blocks with no end draw as 30 minutes, and no
 * block draws shorter than 15.
 */
export function calendarGridMinutes(start: Date, end: Date | undefined): number {
  if (!end) return 30;
  const drawnStart =
    start.getHours() < CALENDAR_START_HOUR
      ? new Date(start.getFullYear(), start.getMonth(), start.getDate(), CALENDAR_START_HOUR)
      : start;
  // The last row is the `CALENDAR_END_HOUR` hour, so the grid ends at the
  // following hour on the block's own day. A block running past it (23:00 to
  // 01:00, or a synced block spanning days) used to hang below the last row
  // and stretch the scroll area. It now stops at the bottom edge.
  const gridEnd = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
    CALENDAR_END_HOUR + 1,
  );
  const drawnEnd = Math.min(end.getTime(), gridEnd.getTime());
  return Math.max(15, (drawnEnd - drawnStart.getTime()) / 60000);
}
