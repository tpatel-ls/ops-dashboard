import { describe, expect, it } from 'vitest';
import type { Task } from '@ops-dashboard/core';
import { shouldAcceptRemote } from './conflicts';

function task(deviceId: string, deletedAt?: string): Task {
  return {
    id: 'task-1',
    title: `copy-${deviceId}`,
    status: 'todo',
    priority: 0,
    tags: [],
    reminders: [],
    checklist: [],
    order: 1,
    createdAt: '2026-08-02T10:00:00.000Z',
    updatedAt: '2026-08-02T12:00:00.000Z',
    version: 4,
    deviceId,
    ...(deletedAt ? { deletedAt } : {}),
  };
}

describe('shouldAcceptRemote', () => {
  it('converges exact version and timestamp ties by device id', () => {
    expect(shouldAcceptRemote(task('device-a'), task('device-z'))).toBe(true);
    expect(shouldAcceptRemote(task('device-z'), task('device-a'))).toBe(false);
  });

  it('preserves a deletion when metadata otherwise ties', () => {
    expect(shouldAcceptRemote(task('device-z'), task('device-a', '2026-08-02T12:00:00.000Z'))).toBe(
      true,
    );
  });
});
