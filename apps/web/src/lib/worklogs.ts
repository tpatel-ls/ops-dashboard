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
  if (!Number.isInteger(minutes) || minutes <= 0) {
    throw new Error('Work log minutes must be a positive integer.');
  }

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

  const ts = at ?? new Date().toISOString();
  const rec = await putRecord(
    'workLogs',
    newRecord<WorkLog>({ projectId, minutes, ...(note ? { note } : {}), at: ts }),
  );
  await patchRecord<Project>('projects', projectId, { lastWorkedAt: ts });
  return rec;
}

export const deleteWorkLog = (id: string) => softDeleteRecord<WorkLog>('workLogs', id);
