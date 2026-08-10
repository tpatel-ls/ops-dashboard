import { describe, expect, it } from 'vitest';
import type { Task } from './types';
import { bumpVersion, pickWinner } from './sync';

function task(deviceId: string, patch: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: deviceId,
    status: 'todo',
    priority: 0,
    tags: [],
    order: 0,
    reminders: [],
    checklist: [],
    createdAt: '2026-07-31T12:00:00.000Z',
    updatedAt: '2026-07-31T12:00:00.000Z',
    version: 2,
    deviceId,
    ...patch,
  };
}

describe('pickWinner', () => {
  it('converges on one device when versions and timestamps tie', () => {
    const alpha = task('device-a');
    const bravo = task('device-b');

    expect(pickWinner(alpha, bravo)).toBe(bravo);
    expect(pickWinner(bravo, alpha)).toBe(bravo);
  });

  it('preserves a tombstone when versions and timestamps tie', () => {
    const live = task('device-z');
    const deleted = task('device-a', { deletedAt: '2026-07-31T12:00:00.000Z' });

    expect(pickWinner(live, deleted)).toBe(deleted);
    expect(pickWinner(deleted, live)).toBe(deleted);
  });

  it('prefers a valid timestamp over malformed sync metadata', () => {
    const valid = task('device-a');
    const malformed = task('device-z', { updatedAt: 'not-a-timestamp' });

    expect(pickWinner(malformed, valid)).toBe(valid);
    expect(pickWinner(valid, malformed)).toBe(valid);
  });

  it('still converges by device when both timestamps are malformed', () => {
    const alpha = task('device-a', { updatedAt: 'invalid-alpha' });
    const bravo = task('device-b', { updatedAt: 'invalid-bravo' });

    expect(pickWinner(alpha, bravo)).toBe(bravo);
    expect(pickWinner(bravo, alpha)).toBe(bravo);
  });

  it('converges when different records share the same device metadata', () => {
    const alpha = task('device-a', { title: 'Alpha' });
    const bravo = task('device-a', { title: 'Bravo' });

    expect(pickWinner(alpha, bravo)).toBe(bravo);
    expect(pickWinner(bravo, alpha)).toBe(bravo);
  });

  it('prefers a valid version over corrupted sync metadata', () => {
    const valid = task('device-a');
    const malformed = task('device-z', { version: Number.NaN });

    expect(pickWinner(malformed, valid)).toBe(valid);
    expect(pickWinner(valid, malformed)).toBe(valid);
  });
});

describe('bumpVersion', () => {
  it('repairs malformed versions instead of propagating NaN', () => {
    expect(bumpVersion(task('device-a', { version: Number.NaN })).version).toBe(1);
  });

  it('normalizes fractional versions before incrementing', () => {
    expect(bumpVersion(task('device-a', { version: 4.8 })).version).toBe(5);
  });
});
