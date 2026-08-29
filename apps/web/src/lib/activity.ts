import { getDb } from '@ops-dashboard/core';
import type { RoutineCheck } from '@ops-dashboard/core';
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

/** Convert any ISO/Date to a local YYYY-MM-DD string. */
function toLocalDate(ts: string | Date): string {
  const d = typeof ts === 'string' ? new Date(ts) : ts;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
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
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    start > end
  ) {
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
    const date = toLocalDate(cursor);
    const score = scores.get(date);
    const count = typeof score === 'number' && Number.isFinite(score) ? Math.max(0, score) : 0;
    result.push({ date, count, level: toLevel(count) });
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
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

  const scores = new Map<string, number>();

  function add(date: string, amount: number) {
    scores.set(date, (scores.get(date) ?? 0) + amount);
  }

  // Tasks completed within the window
  const tasks = await db.tasks
    .filter(
      (t) =>
        !t.deletedAt &&
        t.status === 'done' &&
        activityTimestampOnOrAfter(t.completedAt, start),
    )
    .toArray();
  for (const t of tasks) {
    if (t.completedAt) {
      add(toLocalDate(t.completedAt), WEIGHTS.task);
    }
  }

  // Routine checks that are done within the window
  const checks = await db.routineChecks
    .filter((c: RoutineCheck) => !c.deletedAt && c.done && c.date >= toLocalDate(start))
    .toArray();
  for (const c of checks) {
    add(c.date, WEIGHTS.routine);
  }

  // Journal entries within the window
  const journals = await db.journalEntries
    .filter((j) => !j.deletedAt && j.date >= toLocalDate(start))
    .toArray();
  for (const j of journals) {
    add(j.date, WEIGHTS.journal);
  }

  // WorkLogs within the window
  const worklogs = await db.workLogs
    .filter((w) => !w.deletedAt && activityTimestampOnOrAfter(w.at, start))
    .toArray();
  for (const w of worklogs) {
    const contribution = workLogActivityContribution(w.minutes);
    add(toLocalDate(w.at), contribution);
  }

  return aggregateActivity(scores, start, end);
}
