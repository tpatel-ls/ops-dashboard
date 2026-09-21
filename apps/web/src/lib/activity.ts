import { getDb, isoDay, localDay } from '@ops-dashboard/core';
import type { JournalEntry, RoutineCheck, Task, WorkLog } from '@ops-dashboard/core';
import { differenceInCalendarDays } from 'date-fns';

export interface ActivityDay {
  date: string; // YYYY-MM-DD
  count: number;
  level: number; // 0..4
}

const WEIGHTS = {
  task: 1,
  routine: 2,
  journal: 3,
  workPer30Min: 0.5,
} as const;

const DEFAULT_ACTIVITY_DAYS = 365;
const MAX_ACTIVITY_DAYS = 3660;
const MAX_WORK_LOG_MINUTES = 24 * 60;

export function normalizeActivityDays(days: number): number {
  if (!Number.isFinite(days)) return DEFAULT_ACTIVITY_DAYS;
  return Math.min(MAX_ACTIVITY_DAYS, Math.max(1, Math.floor(days)));
}

export function workLogActivityContribution(minutes: number): number {
  return Number.isSafeInteger(minutes) && minutes > 0 && minutes <= MAX_WORK_LOG_MINUTES
    ? (minutes / 30) * WEIGHTS.workPer30Min
    : 0;
}

export function activityTimestampOnOrAfter(value: unknown, start: Date): boolean {
  if (typeof value !== 'string' || !Number.isFinite(start.getTime())) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp >= start.getTime();
}

export function activityTimestampWithin(value: unknown, start: Date, end: Date): boolean {
  if (typeof value !== 'string') return false;
  const timestamp = Date.parse(value);
  const startTimestamp = start.getTime();
  const endTimestamp = end.getTime();
  return (
    Number.isFinite(timestamp) &&
    Number.isFinite(startTimestamp) &&
    Number.isFinite(endTimestamp) &&
    startTimestamp <= endTimestamp &&
    timestamp >= startTimestamp &&
    timestamp <= endTimestamp
  );
}

/** Derive bucket level 0..4 from a count. */
function toLevel(count: number): number {
  if (count === 0) return 0;
  if (count < 3) return 1;
  if (count < 6) return 2;
  if (count < 10) return 3;
  return 4;
}

/**
 * Pure function: given a flat map of {date -> raw score} and a start/end range,
 * return a dense array covering every day with count and level.
 */
export function aggregateActivity(
  scores: Map<string, number>,
  start: Date,
  end: Date,
): ActivityDay[] {
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start > end) {
    throw new Error('Activity range must be valid.');
  }
  if (differenceInCalendarDays(end, start) + 1 > MAX_ACTIVITY_DAYS) {
    throw new Error(`Activity range must contain at most ${MAX_ACTIVITY_DAYS} days.`);
  }
  const result: ActivityDay[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const endTime = new Date(end);
  endTime.setHours(23, 59, 59, 999);

  while (cursor <= endTime) {
    const date = isoDay(cursor);
    const score = scores.get(date);
    const count = typeof score === 'number' && Number.isFinite(score) ? Math.max(0, score) : 0;
    result.push({ date, count, level: toLevel(count) });
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

export interface ActivityRecords {
  tasks: Array<Pick<Task, 'completedAt'>>;
  checks: Array<Pick<RoutineCheck, 'date'>>;
  journals: Array<Pick<JournalEntry, 'date'>>;
  workLogs: Array<Pick<WorkLog, 'at' | 'minutes'>>;
}

/**
 * Raw score per local calendar day, keyed the way `aggregateActivity` reads it.
 *
 * Every key goes through `localDay`. `routineChecks.date` and
 * `journalEntries.date` are meant to be date-only local days and the write
 * paths enforce that, but synced rows reach Dexie through `fromRow`, which
 * casts without validating. Keying the map on a raw stored timestamp produced
 * a key no grid cell ever matches, so that day's activity silently vanished
 * from the heatmap rather than being misplaced. A value that cannot be
 * resolved to a day is skipped.
 */
export function activityScores(records: ActivityRecords): Map<string, number> {
  const scores = new Map<string, number>();
  const add = (value: string | undefined, amount: number) => {
    const day = localDay(value);
    if (!day || amount === 0) return;
    scores.set(day, (scores.get(day) ?? 0) + amount);
  };

  for (const task of records.tasks) add(task.completedAt, WEIGHTS.task);
  for (const check of records.checks) add(check.date, WEIGHTS.routine);
  for (const journal of records.journals) add(journal.date, WEIGHTS.journal);
  for (const log of records.workLogs) add(log.at, workLogActivityContribution(log.minutes));

  return scores;
}

/**
 * Load all activity from the DB for the last `days` days (default 365),
 * aggregate, and return a dense ActivityDay[] array.
 */
export async function loadActivity(days = 365): Promise<ActivityDay[]> {
  const safeDays = normalizeActivityDays(days);
  const db = getDb();
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - safeDays + 1);
  start.setHours(0, 0, 0, 0);

  const startDay = isoDay(start);

  const [tasks, checks, journals, workLogs] = await Promise.all([
    db.tasks
      .filter(
        (t) =>
          !t.deletedAt && t.status === 'done' && activityTimestampOnOrAfter(t.completedAt, start),
      )
      .toArray(),
    // Compare the resolved day, not the stored string: a row carrying a
    // timestamp would otherwise be admitted or dropped by a string compare
    // against a YYYY-MM-DD bound.
    db.routineChecks
      .filter((c: RoutineCheck) => !c.deletedAt && c.done && (localDay(c.date) ?? '') >= startDay)
      .toArray(),
    db.journalEntries.filter((j) => !j.deletedAt && (localDay(j.date) ?? '') >= startDay).toArray(),
    db.workLogs.filter((w) => !w.deletedAt && activityTimestampOnOrAfter(w.at, start)).toArray(),
  ]);

  return aggregateActivity(activityScores({ tasks, checks, journals, workLogs }), start, end);
}
