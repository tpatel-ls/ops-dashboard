import { describe, expect, it } from 'vitest';
import type { Task } from '@ops-dashboard/core';
import { compareTasks, compareTasksBy, matchesTaskSearch, matchesTaskTag } from './task-query';

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

  it('sorts timestamps by their browser-local calendar day', () => {
    const timestamp = '2026-08-01T00:30:00+14:00';
    const tasks = [
      task('calendar-day', { scheduledFor: '2026-08-01' }),
      task('local-day', { dueAt: timestamp }),
    ];

    expect(tasks.sort(compareTasks).map((item) => item.id)).toEqual(['local-day', 'calendar-day']);
  });

  it('treats impossible scheduled days as undated', () => {
    const tasks = [
      task('invalid', { scheduledFor: '2026-02-30', priority: 3 }),
      task('valid', { scheduledFor: '2026-03-01' }),
    ];

    expect(tasks.sort(compareTasks).map((item) => item.id)).toEqual(['valid', 'invalid']);
  });

  it('uses order and title as stable tie breakers', () => {
    const tasks = [
      task('z', { title: 'Zulu', order: 2 }),
      task('b', { title: 'Beta', order: 1 }),
      task('a', { title: 'Alpha', order: 1 }),
    ];

    expect(tasks.sort(compareTasks).map((item) => item.title)).toEqual(['Alpha', 'Beta', 'Zulu']);
  });

  it('sorts predictably when imported numeric fields are malformed', () => {
    const tasks = [
      task('invalid-order', { order: Number.NaN }),
      task('valid-order', { order: 2 }),
      task('invalid-priority', {
        priority: Number.POSITIVE_INFINITY as Task['priority'],
        order: 1,
      }),
      task('urgent', { priority: 3, order: 3 }),
    ];

    expect(tasks.sort(compareTasks).map((item) => item.id)).toEqual([
      'urgent',
      'invalid-priority',
      'valid-order',
      'invalid-order',
    ]);
  });
});

describe('compareTasksBy', () => {
  const dated = task('dated', { scheduledFor: '2026-07-16', priority: 0 });
  const urgent = task('urgent', { priority: 3 });

  it('preserves the current order as the default', () => {
    expect([urgent, dated].sort((a, b) => compareTasksBy('default', a, b))).toEqual([
      dated,
      urgent,
    ]);
  });

  it('keeps dated work first for due-date sorting', () => {
    expect([urgent, dated].sort((a, b) => compareTasksBy('due', a, b))).toEqual([dated, urgent]);
  });

  it('puts urgent work first for priority sorting', () => {
    expect([dated, urgent].sort((a, b) => compareTasksBy('priority', a, b))).toEqual([
      urgent,
      dated,
    ]);
  });

  it('puts the most recently updated work first for recent sorting', () => {
    const older = task('older', {
      priority: 3,
      scheduledFor: '2026-07-15',
      updatedAt: '2026-07-15T09:00:00.000Z',
    });
    const newer = task('newer', {
      updatedAt: '2026-07-16T09:00:00.000Z',
    });

    expect([older, newer].sort((a, b) => compareTasksBy('recent', a, b))).toEqual([newer, older]);
  });

  it('puts malformed update timestamps after valid recent work', () => {
    const valid = task('valid', { updatedAt: '2026-07-15T09:00:00.000Z' });
    const malformed = task('malformed', { updatedAt: 'not-a-timestamp', priority: 3 });

    expect([malformed, valid].sort((a, b) => compareTasksBy('recent', a, b))).toEqual([
      valid,
      malformed,
    ]);
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

describe('matchesTaskTag', () => {
  const taggedTask = task('tagged', { tags: ['Dialer', 'FollowUp'] });

  it('matches a selected tag without case sensitivity', () => {
    expect(matchesTaskTag(taggedTask, 'dialer')).toBe(true);
    expect(matchesTaskTag(taggedTask, 'FOLLOWUP')).toBe(true);
    expect(matchesTaskTag(taggedTask, 'finance')).toBe(false);
  });

  it('keeps every task when no tag is selected', () => {
    expect(matchesTaskTag(taggedTask, null)).toBe(true);
  });
});
