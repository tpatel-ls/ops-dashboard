'use client';

import { getDb, isoDay, localDay, todayIso } from '@ops-dashboard/core';
import type { Routine, RoutineCheck, RoutineKind, TimeOfDay } from '@ops-dashboard/core';
import { newRecord, patchRecord, putRecord, softDeleteRecord } from './records';

const TIMES_OF_DAY = new Set<TimeOfDay>(['morning', 'afternoon', 'evening', 'anytime']);
const ROUTINE_KINDS = new Set<RoutineKind>(['ongoing', 'fixed']);
const ROUTINE_CHECK_SOURCES = new Set<NonNullable<RoutineCheck['source']>>([
  'manual',
  'journal',
  'capture',
]);

function normalizeRoutinePatch(patch: Partial<Routine>): Partial<Routine> {
  const normalized = { ...patch };
  if (Object.hasOwn(normalized, 'name')) {
    if (typeof normalized.name !== 'string') throw new Error('Routine name is required.');
    normalized.name = normalized.name.trim();
    if (!normalized.name) throw new Error('Routine name is required.');
  }
  if (normalized.specificTime !== undefined) {
    normalized.specificTime = normalized.specificTime.trim() || undefined;
    if (normalized.specificTime && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(normalized.specificTime)) {
      throw new Error('Routine time must use 24-hour HH:mm format.');
    }
  }
  if (
    normalized.durationDays !== undefined &&
    (!Number.isInteger(normalized.durationDays) || normalized.durationDays <= 0)
  ) {
    throw new Error('Routine duration must be a positive whole number of days.');
  }
  for (const key of ['startDate', 'endDate'] as const) {
    const value = normalized[key];
    if (
      Object.hasOwn(normalized, key) &&
      (key === 'startDate'
        ? typeof value !== 'string' || localDay(value) !== value
        : value !== undefined && localDay(value) !== value)
    ) {
      throw new Error(
        `Routine ${key === 'startDate' ? 'start date' : 'end date'} must be a valid calendar day.`,
      );
    }
  }
  if (Object.hasOwn(normalized, 'timeOfDay') && !TIMES_OF_DAY.has(normalized.timeOfDay!)) {
    throw new Error('Routine time of day must be valid.');
  }
  if (Object.hasOwn(normalized, 'kind') && !ROUTINE_KINDS.has(normalized.kind!)) {
    throw new Error('Routine kind must be valid.');
  }
  if (Object.hasOwn(normalized, 'notify') && typeof normalized.notify !== 'boolean') {
    throw new Error('Routine notification preference must be boolean.');
  }
  if (Object.hasOwn(normalized, 'order') && !Number.isFinite(normalized.order)) {
    throw new Error('Routine order must be finite.');
  }
  for (const key of ['description', 'domainId', 'color'] as const) {
    if (normalized[key] !== undefined) normalized[key] = normalized[key]?.trim() || undefined;
  }
  return normalized;
}

export interface CreateRoutineInput {
  name: string;
  description?: string;
  timeOfDay?: TimeOfDay;
  specificTime?: string;
  notify?: boolean;
  domainId?: string;
  kind?: RoutineKind;
  durationDays?: number;
  startDate?: string;
  color?: string;
  order?: number;
}

/**
 * Length of a fixed routine in days, or undefined when it has none.
 *
 * `normalizeRoutinePatch` rejects a `durationDays` that is not a positive
 * integer, but synced rows reach Dexie through `fromRow`, which casts without
 * validating. The progress badge tested the field for truthiness, which lets a
 * negative or fractional value through, so a corrupt routine rendered
 * "day -5 / -5" instead of falling back to the ongoing badge.
 */
export function fixedRoutineDuration(
  routine: Pick<Routine, 'kind' | 'durationDays'>,
): number | undefined {
  if (routine.kind !== 'fixed') return undefined;
  const days = routine.durationDays;
  return Number.isInteger(days) && days! > 0 ? days : undefined;
}

export function addDaysISO(iso: string, days: number): string {
  if (localDay(iso) !== iso || !Number.isInteger(days)) {
    throw new Error('Routine date must be a valid calendar day.');
  }
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  date.setDate(date.getDate() + days);
  if (!Number.isFinite(date.getTime())) {
    throw new Error('Routine date calculation is out of range.');
  }
  return isoDay(date);
}

export function createRoutine(input: CreateRoutineInput): Promise<Routine> {
  const startDate = input.startDate ?? todayIso();
  const fields = normalizeRoutinePatch({
    name: input.name,
    description: input.description,
    timeOfDay: input.timeOfDay ?? 'anytime',
    specificTime: input.specificTime,
    notify: input.notify ?? false,
    domainId: input.domainId,
    kind: input.kind ?? 'ongoing',
    durationDays: input.durationDays,
    startDate,
    color: input.color,
    order: input.order ?? Date.now(),
  });
  const kind = fields.kind!;
  if (kind === 'fixed' && fields.durationDays === undefined) {
    throw new Error('Fixed routines require a duration.');
  }
  const durationDays = kind === 'fixed' ? fields.durationDays : undefined;
  const endDate =
    kind === 'fixed' && durationDays ? addDaysISO(fields.startDate!, durationDays - 1) : undefined;
  return putRecord(
    'routines',
    newRecord<Routine>({
      name: fields.name!,
      ...(fields.description ? { description: fields.description } : {}),
      timeOfDay: fields.timeOfDay!,
      ...(fields.specificTime ? { specificTime: fields.specificTime } : {}),
      notify: fields.notify!,
      ...(fields.domainId ? { domainId: fields.domainId } : {}),
      kind,
      ...(durationDays ? { durationDays } : {}),
      startDate: fields.startDate!,
      ...(endDate ? { endDate } : {}),
      ...(fields.color ? { color: fields.color } : {}),
      order: fields.order!,
    }),
  );
}

export function updateRoutine(id: string, patch: Partial<Routine>) {
  const fields = normalizeRoutinePatch(patch);
  const changesSchedule = ['kind', 'startDate', 'durationDays', 'endDate'].some((key) =>
    Object.hasOwn(fields, key),
  );
  if (!changesSchedule) return patchRecord<Routine>('routines', id, fields);

  return updateRoutineSchedule(id, fields);
}

async function updateRoutineSchedule(id: string, fields: Partial<Routine>) {
  const existing = await getDb().routines.get(id);
  if (!existing || existing.deletedAt) return null;
  const kind = fields.kind ?? existing.kind;
  const startDate = fields.startDate ?? existing.startDate;
  // normalizeRoutinePatch already rejects a bad duration supplied in the patch,
  // but one inherited from the stored row is unvalidated: fromRow casts synced
  // rows without checking. A negative duration passed the truthiness test below
  // and produced an endDate before startDate, which makes toggleRoutineCheck
  // reject every date and leaves the routine permanently un-checkable.
  const requestedDuration = fields.durationDays ?? existing.durationDays;
  const durationDays =
    Number.isInteger(requestedDuration) && requestedDuration! > 0 ? requestedDuration : undefined;
  if (kind === 'fixed' && durationDays === undefined) {
    throw new Error('Fixed routines require a duration.');
  }
  fields.durationDays = kind === 'fixed' ? durationDays : undefined;
  fields.endDate =
    kind === 'fixed' && durationDays ? addDaysISO(startDate, durationDays - 1) : undefined;
  return patchRecord<Routine>('routines', id, fields);
}

export const archiveRoutine = (id: string) =>
  patchRecord<Routine>('routines', id, { archivedAt: new Date().toISOString() });

export const deleteRoutine = (id: string) => softDeleteRecord<Routine>('routines', id);

/** Create or flip the single check record for a routine on a given day. */
export async function toggleRoutineCheck(
  routineId: string,
  date: string,
  done: boolean,
  source: 'manual' | 'journal' | 'capture' = 'manual',
): Promise<void> {
  if (typeof routineId !== 'string' || !routineId.trim()) {
    throw new Error('Routine check target must be valid.');
  }
  if (localDay(date) !== date) {
    throw new Error('Routine check date must be a valid calendar day.');
  }
  if (typeof done !== 'boolean') throw new Error('Routine check state must be boolean.');
  if (!ROUTINE_CHECK_SOURCES.has(source)) {
    throw new Error('Routine check source must be valid.');
  }
  const normalizedRoutineId = routineId.trim();
  const db = getDb();
  const routine = await db.routines.get(normalizedRoutineId);
  if (!routine || routine.deletedAt || routine.archivedAt) {
    throw new Error('Routine is not available for check-ins.');
  }
  // Resolve the stored bounds rather than requiring them to already be
  // date-only. `startDate` and `endDate` are written date-only, but synced rows
  // reach Dexie through `fromRow`, which casts without validating, so one can
  // arrive as an instant. Demanding the literal form there rejected every date
  // and left the routine permanently un-checkable, the same dead end a bad
  // stored duration used to cause. A bound that resolves to no day at all is
  // still unusable and keeps rejecting.
  const startDate = localDay(routine.startDate);
  const endDate = routine.endDate ? localDay(routine.endDate) : undefined;
  if (
    !startDate ||
    date < startDate ||
    (routine.endDate !== undefined && (!endDate || date > endDate))
  ) {
    throw new Error('Routine is not active on this date.');
  }
  const matchingChecks = await db.routineChecks
    .where('[routineId+date]')
    .equals([normalizedRoutineId, date])
    .toArray();
  const existing = matchingChecks.find((check) => !check.deletedAt);
  const completedAt = done ? new Date().toISOString() : undefined;
  if (existing) {
    await patchRecord<RoutineCheck>('routineChecks', existing.id, {
      done,
      completedAt: completedAt as RoutineCheck['completedAt'],
      source,
    });
  } else {
    await putRecord(
      'routineChecks',
      newRecord<RoutineCheck>({
        routineId: normalizedRoutineId,
        date,
        done,
        ...(completedAt ? { completedAt } : {}),
        source,
      }),
    );
  }
}

/**
 * Whether `routineId` is checked off on the local calendar day `day`.
 *
 * Comparing `check.date` to the day with `===` only matches a check already
 * stored date-only. A check synced from another device reaches Dexie through
 * `fromRow`, which casts without validating, so it can carry an instant; that
 * check read as not done and the routine offered to be completed again.
 */
export function isRoutineDoneOn(checks: RoutineCheck[], routineId: string, day: string): boolean {
  return checks.some(
    (check) =>
      check.routineId === routineId &&
      check.done &&
      !check.deletedAt &&
      localDay(check.date) === day,
  );
}

/**
 * Consecutive done-days ending today (or yesterday if today is not done yet).
 *
 * `routineChecks.date` is meant to be a date-only local day and the write path
 * enforces that, but synced rows reach Dexie through `fromRow`, which casts
 * without validating. Dropping a check whose date arrived as a timestamp broke
 * the streak at that day and reported a shorter run than the user had kept, so
 * every stored day is resolved through `localDay` instead.
 */
export function computeStreak(checks: RoutineCheck[], today = todayIso()): number {
  if (localDay(today) !== today) return 0;
  const done = new Set(
    checks
      .filter((check) => check.done && !check.deletedAt)
      .map((check) => localDay(check.date))
      .filter((day): day is string => Boolean(day)),
  );
  let streak = 0;
  let cursor = today;
  if (!done.has(cursor)) cursor = addDaysISO(cursor, -1);
  while (done.has(cursor)) {
    streak += 1;
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
}
