'use client';

import { getDb } from '@ops-dashboard/core';
import type { Project, WorkLog } from '@ops-dashboard/core';
import { newRecord, patchRecord, putRecord, softDeleteRecord } from './records';

/** Log time against a project and stamp the project's lastWorkedAt (drives slipping). */
export async function logWork(
  projectId: string,
  minutes: number,
  note?: string,
  at?: string,
): Promise<WorkLog> {
  if (!Number.isSafeInteger(minutes) || minutes <= 0) {
    throw new Error('Work log minutes must be a positive integer.');
  }
  if (at !== undefined && (!at.trim() || !Number.isFinite(Date.parse(at)))) {
    throw new Error('Work log time must be a valid date.');
  }
  const normalizedNote = note?.trim();

  const project = await getDb().projects.get(projectId);
  if (
    !project ||
    project.deletedAt ||
    project.archivedAt ||
    project.status === 'done' ||
    project.status === 'archived'
  ) {
    throw new Error('Project is not available for progress logging.');
  }

  const ts = at ? new Date(Date.parse(at)).toISOString() : new Date().toISOString();
  const rec = await putRecord(
    'workLogs',
    newRecord<WorkLog>({
      projectId,
      minutes,
      ...(normalizedNote ? { note: normalizedNote } : {}),
      at: ts,
    }),
  );
  const previousTimestamp = project.lastWorkedAt ? Date.parse(project.lastWorkedAt) : Number.NaN;
  if (!Number.isFinite(previousTimestamp) || Date.parse(ts) > previousTimestamp) {
    await patchRecord<Project>('projects', projectId, { lastWorkedAt: ts });
  }
  return rec;
}

export async function deleteWorkLog(id: string): Promise<void> {
  const db = getDb();
  const existing = await db.workLogs.get(id);
  if (!existing || existing.deletedAt) return;

  await softDeleteRecord<WorkLog>('workLogs', id);
  const project = await db.projects.get(existing.projectId);
  if (!project || project.lastWorkedAt !== existing.at) return;

  const remaining = await db.workLogs.where('projectId').equals(existing.projectId).toArray();
  const latest = remaining
    .map((log) => ({ log, timestamp: Date.parse(log.at) }))
    .filter(({ log, timestamp }) => log.id !== id && !log.deletedAt && Number.isFinite(timestamp))
    .sort((a, b) => b.timestamp - a.timestamp)[0]?.log;
  await patchRecord<Project>('projects', existing.projectId, {
    lastWorkedAt: latest?.at,
  });
}
