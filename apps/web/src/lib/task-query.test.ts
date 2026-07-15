import { describe, expect, it } from 'vitest';
import type { Task } from '@ops-dashboard/core';
import { compareTasks, matchesTaskSearch } from './task-query';

function task(id: string, patch: Partial<Task> = {}): Task {
  return {
    id,
    title: id,
    status: 'todo',
    priority: 0,
    tags: [],
    reminders: [],
    checklist: [],
    order: 0,
    createdAt: '2026-07-15T12:00:00.000Z',
    updatedAt: '2026-07-15T12:00:00.000Z',
    version: 1,
    deviceId: 'test',
    ...patch,
  };
}

describe('compareTasks', () => {
  it('sorts dated tasks first by date and then by priority', () => {
    const tasks = [
      task('undated', { priority: 3 }),
      task('tomorrow', { scheduledFor: '2026-07-16', priority: 3 }),
      task('today-normal', { scheduledFor: '2026-07-15', priority: 0 }),
      task('today-urgent', { scheduledFor: '2026-07-15', priority: 3 }),
    ];

    expect(tasks.sort(compareTasks).map((item) => item.id)).toEqual([
      'today-urgent',
      'today-normal',
      'tomorrow',
      'undated',
    ]);
  });

  it('uses order and title as stable tie breakers', () => {
    const tasks = [
      task('z', { title: 'Zulu', order: 2 }),
      task('b', { title: 'Beta', order: 1 }),
      task('a', { title: 'Alpha', order: 1 }),
    ];

    expect(tasks.sort(compareTasks).map((item) => item.title)).toEqual(['Alpha', 'Beta', 'Zulu']);
  });
});

describe('matchesTaskSearch', () => {
  const launchTask = task('launch', { title: 'Prepare Launch Review' });

  it('matches task titles without case sensitivity', () => {
    expect(matchesTaskSearch(launchTask, 'launch')).toBe(true);
    expect(matchesTaskSearch(launchTask, 'REVIEW')).toBe(true);
  });

  it('matches the related project name', () => {
    expect(matchesTaskSearch(launchTask, 'blue text', 'Blue Text')).toBe(true);
  });

  it('keeps every task for an empty query and rejects unrelated text', () => {
    expect(matchesTaskSearch(launchTask, '   ')).toBe(true);
    expect(matchesTaskSearch(launchTask, 'billing')).toBe(false);
  });
});
