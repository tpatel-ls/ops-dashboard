'use client';

import { getDb } from '@ops-dashboard/core';
import type { Routine, RoutineCheck, RoutineKind, TimeOfDay } from '@ops-dashboard/core';
import { newRecord, patchRecord, putRecord, softDeleteRecord } from './records';

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

/** Format a Date as a LOCAL YYYY-MM-DD (not UTC). All `date` fields store local. */
function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return formatLocalDate(new Date());
}

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

export function createRoutine(input: CreateRoutineInput): Promise<Routine> {
  const startDate = input.startDate ?? todayISO();
  const kind = input.kind ?? 'ongoing';
  const endDate =
    kind === 'fixed' && input.durationDays ? addDaysISO(startDate, input.durationDays - 1) : undefined;
  return putRecord(
    'routines',
    newRecord<Routine>({
      name: input.name,
      ...(input.description ? { description: input.description } : {}),
      timeOfDay: input.timeOfDay ?? 'anytime',
      ...(input.specificTime ? { specificTime: input.specificTime } : {}),
      notify: input.notify ?? false,
      ...(input.domainId ? { domainId: input.domainId } : {}),
      kind,
      ...(input.durationDays ? { durationDays: input.durationDays } : {}),
      startDate,
      ...(endDate ? { endDate } : {}),
      ...(input.color ? { color: input.color } : {}),
      order: input.order ?? Date.now(),
    }),
  );
}

export const updateRoutine = (id: string, patch: Partial<Routine>) =>
  patchRecord<Routine>('routines', id, patch);

export const archiveRoutine = (id: string) =>
  patchRecord<Routine>('routines', id, { archivedAt: new Date().toISOString() });

export const deleteRoutine = (id: string) => softDeleteRecord<Routine>('routines', id);

/** Create or flip the single check record for a routine on a given day. */
export async function toggleRoutineCheck(
  routineId: string,
  date: string,
  done: boolean,
  source: 'manual' | 'journal' = 'manual',
): Promise<void> {
  const db = getDb();
  const existing = await db.routineChecks.where('[routineId+date]').equals([routineId, date]).first();
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
        routineId,
        date,
        done,
        ...(completedAt ? { completedAt } : {}),
        source,
      }),
    );
  }
}

/** Consecutive done-days ending today (or yesterday if today is not done yet). */
export function computeStreak(checks: RoutineCheck[], today = todayISO()): number {
  const done = new Set(checks.filter((c) => c.done && !c.deletedAt).map((c) => c.date));
  let streak = 0;
  let cursor = today;
  if (!done.has(cursor)) cursor = addDaysISO(cursor, -1);
  while (done.has(cursor)) {
    streak += 1;
    cursor = addDaysISO(cursor, -1);
  }
  return streak;
}
