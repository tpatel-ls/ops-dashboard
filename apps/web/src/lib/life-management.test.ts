import { describe, expect, it } from 'vitest';
import type {
  Capture,
  Domain,
  FoodLog,
  JournalEntry,
  Project,
  Routine,
  RoutineCheck,
  Task,
} from '@ops-dashboard/core';
import { summarizeLifeManagement } from './life-management';

const now = new Date('2026-07-06T14:00:00.000Z');

function meta(id: string, date = '2026-07-06T12:00:00.000Z') {
  return {
    id,
    createdAt: date,
    updatedAt: date,
    version: 1,
    deviceId: 'test',
  };
}

describe('life management summary', () => {
  it('rolls all major life surfaces into a command summary', () => {
    const domains = [
      { ...meta('body', '2026-06-01T12:00:00.000Z'), name: 'Body', color: '#f60', order: 1 },
      { ...meta('work', '2026-07-06T12:00:00.000Z'), name: 'Work', color: '#06f', order: 2 },
      { ...meta('home', '2026-06-15T12:00:00.000Z'), name: 'Home', color: '#0a6', order: 3 },
    ] satisfies Domain[];
    const projects = [
      {
        ...meta('app', '2026-06-25T12:00:00.000Z'),
        name: 'Identity OS',
        color: '#f60',
        kind: 'project',
        status: 'active',
        domainId: 'work',
        lastWorkedAt: '2026-06-25T12:00:00.000Z',
        milestones: [],
        checklists: [],
      },
    ] satisfies Project[];
    const tasks = [
      {
        ...meta('overdue'),
        title: 'Ship project brief',
        status: 'todo',
        priority: 3,
        tags: [],
        order: 1,
        reminders: [],
        checklist: [],
        domainId: 'work',
        dueAt: '2026-07-05T17:00:00.000Z',
      },
      {
        ...meta('today'),
        title: 'Train legs',
        status: 'todo',
        priority: 2,
        tags: [],
        order: 2,
        reminders: [],
        checklist: [],
        domainId: 'body',
        scheduledFor: '2026-07-06',
      },
      {
        ...meta('done'),
        title: 'Morning walk',
        status: 'done',
        priority: 1,
        tags: [],
        order: 3,
        reminders: [],
        checklist: [],
        completedAt: '2026-07-06T08:00:00.000Z',
      },
    ] satisfies Task[];
    const routines = [
      {
        ...meta('workout'),
        name: 'Workout',
        timeOfDay: 'morning',
        notify: true,
        kind: 'ongoing',
        startDate: '2026-07-01',
        order: 1,
      },
      {
        ...meta('read'),
        name: 'Read',
        timeOfDay: 'evening',
        notify: false,
        kind: 'ongoing',
        startDate: '2026-07-01',
        order: 2,
      },
    ] satisfies Routine[];
    const routineChecks = [
      {
        ...meta('check-workout'),
        routineId: 'workout',
        date: '2026-07-06',
        done: true,
        completedAt: '2026-07-06T07:00:00.000Z',
      },
    ] satisfies RoutineCheck[];
    const captures = [
      { ...meta('capture'), raw: 'call Alex', source: 'voice', status: 'pending' },
    ] satisfies Capture[];
    const journalEntries = [
      {
        ...meta('journal', '2026-07-03T12:00:00.000Z'),
        date: '2026-07-03',
        body: 'Good day.',
        mediaUrls: [],
        tags: [],
      },
    ] satisfies JournalEntry[];
    const foodLogs = [
      {
        ...meta('meal'),
        date: '2026-07-06',
        mealType: 'breakfast',
        description: 'Eggs',
        items: [],
        totalCalories: 300,
      },
    ] satisfies FoodLog[];

    const summary = summarizeLifeManagement({
      tasks,
      projects,
      domains,
      routines,
      routineChecks,
      captures,
      journalEntries,
      foodLogs,
      today: '2026-07-06',
      now,
    });

    expect(summary.openTasks).toBe(2);
    expect(summary.overdue).toBe(1);
    expect(summary.dueToday).toBe(1);
    expect(summary.activeProjects).toBe(1);
    expect(summary.slippingProjects).toBe(1);
    expect(summary.pendingCaptures).toBe(1);
    expect(summary.routineDone).toBe(1);
    expect(summary.routineTotal).toBe(2);
    expect(summary.mealsLogged).toBe(1);
    expect(summary.journalGapDays).toBe(3);
    expect(summary.staleDomains).toBeGreaterThan(0);
    expect(summary.modules.map((module) => module.id)).toEqual([
      'tasks',
      'projects',
      'identity',
      'routines',
      'nutrition',
      'journal',
      'capture',
      'domains',
    ]);
    expect(summary.attention[0]).toEqual(
      expect.objectContaining({
        id: 'captures',
        href: '/inbox',
      }),
    );
  });

  it('treats an empty system as needing capture, habits, and first logs', () => {
    const summary = summarizeLifeManagement({
      tasks: [],
      projects: [],
      domains: [],
      routines: [],
      routineChecks: [],
      captures: [],
      journalEntries: [],
      foodLogs: [],
      today: '2026-07-06',
      now,
    });

    expect(summary.commandScore).toBeLessThan(80);
    expect(summary.routinePct).toBe(100);
    expect(summary.journalGapDays).toBeNull();
    expect(summary.attention.some((item) => item.id === 'food')).toBe(true);
  });
});
