import { describe, expect, it } from 'vitest';
import type { Capture, Domain, Project, Task } from '@ops-dashboard/core';
import { findCaptureRoutingIssues, findStaleDomains, summarizeBriefing } from './briefing';

const now = new Date('2026-07-03T14:00:00.000Z');

function meta(id: string, updatedAt = now.toISOString()) {
  return {
    id,
    createdAt: updatedAt,
    updatedAt,
    version: 1,
    deviceId: 'test',
  };
}

describe('briefing helpers', () => {
  it('surfaces stale domains using the freshest connected task or project activity', () => {
    const domains = [
      { ...meta('body', '2026-06-01T12:00:00.000Z'), name: 'Body', color: '#111', order: 1 },
      { ...meta('craft', '2026-06-01T12:00:00.000Z'), name: 'Craft', color: '#222', order: 2 },
      { ...meta('home', '2026-06-30T12:00:00.000Z'), name: 'Home', color: '#333', order: 3 },
    ] satisfies Domain[];

    const projects = [
      {
        ...meta('site', '2026-07-02T12:00:00.000Z'),
        name: 'Portfolio',
        color: '#fff',
        kind: 'project',
        status: 'active',
        domainId: 'craft',
        milestones: [],
        checklists: [],
        lastWorkedAt: '2026-07-02T12:00:00.000Z',
      },
    ] satisfies Project[];

    const tasks = [
      {
        ...meta('task-1', '2026-06-20T12:00:00.000Z'),
        title: 'Train legs',
        status: 'todo',
        priority: 2,
        tags: [],
        order: 1,
        reminders: [],
        checklist: [],
        domainId: 'body',
      },
    ] satisfies Task[];

    const stale = findStaleDomains({ domains, projects, tasks, now, staleAfterDays: 7 });

    expect(stale).toEqual([
      expect.objectContaining({
        domainId: 'body',
        domainName: 'Body',
        daysIdle: 13,
        lastTouchedAt: '2026-06-20T12:00:00.000Z',
      }),
    ]);
  });

  it('ignores malformed and future timestamps when measuring domain activity', () => {
    const domain = {
      ...meta('body', '2026-06-01T12:00:00.000Z'),
      name: 'Body',
      color: '#111',
      order: 1,
    } satisfies Domain;
    const tasks = [
      {
        ...meta('malformed', 'not-a-date'),
        title: 'Imported task',
        status: 'todo',
        priority: 0,
        tags: [],
        order: 1,
        reminders: [],
        checklist: [],
        domainId: domain.id,
      },
      {
        ...meta('future', '2026-07-10T12:00:00.000Z'),
        title: 'Clock skew task',
        status: 'todo',
        priority: 0,
        tags: [],
        order: 2,
        reminders: [],
        checklist: [],
        domainId: domain.id,
      },
    ] satisfies Task[];

    expect(
      findStaleDomains({ domains: [domain], projects: [], tasks, now, staleAfterDays: 7 }),
    ).toEqual([
      expect.objectContaining({
        domainId: 'body',
        lastTouchedAt: '2026-06-01T12:00:00.000Z',
      }),
    ]);
  });

  it('does not let archived work keep a domain fresh', () => {
    const domain = {
      ...meta('body', '2026-06-01T12:00:00.000Z'),
      name: 'Body',
      color: '#111',
      order: 1,
    } satisfies Domain;
    const archivedTask = {
      ...meta('archived-task', '2026-07-03T12:00:00.000Z'),
      title: 'Old plan',
      status: 'archived',
      priority: 0,
      tags: [],
      order: 1,
      reminders: [],
      checklist: [],
      domainId: domain.id,
    } satisfies Task;
    const archivedProject = {
      ...meta('archived-project', '2026-07-03T12:00:00.000Z'),
      name: 'Old project',
      color: '#fff',
      kind: 'project',
      status: 'archived',
      domainId: domain.id,
      milestones: [],
      checklists: [],
    } satisfies Project;

    expect(
      findStaleDomains({
        domains: [domain],
        projects: [archivedProject],
        tasks: [archivedTask],
        now,
        staleAfterDays: 7,
      }),
    ).toEqual([
      expect.objectContaining({
        domainId: 'body',
        lastTouchedAt: '2026-06-01T12:00:00.000Z',
      }),
    ]);
  });

  it('inherits domain activity from a task project for legacy records', () => {
    const domain = {
      ...meta('craft', '2026-06-01T12:00:00.000Z'),
      name: 'Craft',
      color: '#222',
      order: 1,
    } satisfies Domain;
    const project = {
      ...meta('site', '2026-06-01T12:00:00.000Z'),
      name: 'Portfolio',
      color: '#fff',
      kind: 'project',
      status: 'active',
      domainId: domain.id,
      milestones: [],
      checklists: [],
    } satisfies Project;
    const task = {
      ...meta('legacy-task', '2026-07-02T12:00:00.000Z'),
      title: 'Ship portfolio',
      status: 'todo',
      priority: 1,
      tags: [],
      order: 1,
      reminders: [],
      checklist: [],
      projectId: project.id,
    } satisfies Task;

    expect(
      findStaleDomains({
        domains: [domain],
        projects: [project],
        tasks: [task],
        now,
        staleAfterDays: 7,
      }),
    ).toEqual([]);
  });

  it('uses the default stale window for malformed thresholds', () => {
    const domain = {
      ...meta('body', '2026-07-02T12:00:00.000Z'),
      name: 'Body',
      color: '#111',
      order: 1,
    } satisfies Domain;

    expect(
      findStaleDomains({
        domains: [domain],
        projects: [],
        tasks: [],
        now,
        staleAfterDays: -1,
      }),
    ).toEqual([]);
  });

  it('measures idle calendar days across daylight-saving changes', () => {
    const originalTimezone = process.env.TZ;
    process.env.TZ = 'America/Chicago';
    try {
      const domain = {
        ...meta('body', new Date(2026, 2, 8, 0).toISOString()),
        name: 'Body',
        color: '#111',
        order: 1,
      } satisfies Domain;

      expect(
        findStaleDomains({
          domains: [domain],
          projects: [],
          tasks: [],
          now: new Date(2026, 2, 9, 0),
          staleAfterDays: 0,
        }),
      ).toEqual([expect.objectContaining({ domainId: 'body', daysIdle: 1 })]);
    } finally {
      process.env.TZ = originalTimezone;
    }
  });

  it('flags captures that are pending or routed to unattached tasks', () => {
    const captures = [
      {
        ...meta('pending'),
        raw: 'remember to renew passport',
        source: 'voice',
        status: 'pending',
      },
      {
        ...meta('triaged'),
        raw: 'call Alex about the site',
        source: 'watch',
        status: 'triaged',
        routedTo: { type: 'task', id: 'task-without-context' },
        aiSummary: 'Call Alex about the site',
      },
      {
        ...meta('dismissed'),
        raw: 'ignore me',
        source: 'text',
        status: 'dismissed',
      },
    ] satisfies Capture[];

    const tasks = [
      {
        ...meta('task-without-context'),
        title: 'Call Alex about the site',
        status: 'todo',
        priority: 1,
        tags: [],
        order: 1,
        reminders: [],
        checklist: [],
      },
    ] satisfies Task[];

    expect(findCaptureRoutingIssues(captures, tasks)).toEqual([
      expect.objectContaining({ captureId: 'pending', reason: 'unprocessed' }),
      expect.objectContaining({
        captureId: 'triaged',
        reason: 'missing-context',
        title: 'Call Alex about the site',
      }),
    ]);
  });

  it('orders routing issues by instant and puts malformed timestamps last', () => {
    const captures = [
      {
        ...meta('later', '2026-07-03T09:30:00-05:00'),
        raw: 'Later issue',
        source: 'text',
        status: 'pending',
      },
      {
        ...meta('earlier', '2026-07-03T15:00:00+02:00'),
        raw: 'Earlier issue',
        source: 'text',
        status: 'pending',
      },
      {
        ...meta('malformed', 'not-a-date'),
        raw: 'Malformed issue',
        source: 'text',
        status: 'pending',
      },
    ] satisfies Capture[];

    expect(findCaptureRoutingIssues(captures, []).map((issue) => issue.captureId)).toEqual([
      'later',
      'earlier',
      'malformed',
    ]);
  });

  it('falls back from blank AI summaries to captured text', () => {
    const capture = {
      ...meta('pending'),
      raw: '  Renew passport  ',
      source: 'voice',
      status: 'pending',
      aiSummary: '   ',
    } satisfies Capture;

    expect(findCaptureRoutingIssues([capture], [])[0]?.title).toBe('Renew passport');
  });

  it('summarizes the operating cockpit counts for the briefing header', () => {
    const tasks = [
      {
        ...meta('today-open'),
        title: 'Ship briefing',
        status: 'todo',
        priority: 2,
        tags: [],
        order: 1,
        reminders: [],
        checklist: [],
        scheduledFor: '2026-07-03',
      },
      {
        ...meta('overdue'),
        title: 'Pay invoice',
        status: 'todo',
        priority: 3,
        tags: [],
        order: 2,
        reminders: [],
        checklist: [],
        dueAt: '2026-07-02T17:00:00.000Z',
      },
      {
        ...meta('done'),
        title: 'Workout',
        status: 'done',
        priority: 1,
        tags: [],
        order: 3,
        reminders: [],
        checklist: [],
        scheduledFor: '2026-07-03',
        completedAt: '2026-07-03T09:00:00.000Z',
      },
    ] satisfies Task[];

    expect(
      summarizeBriefing({ tasks, today: '2026-07-03', routingIssues: 2, staleDomains: 1 }),
    ).toEqual({
      todayTotal: 3,
      doneToday: 1,
      openToday: 2,
      overdue: 1,
      routingIssues: 2,
      staleDomains: 1,
    });
  });

  it('does not carry previously completed overdue work into today', () => {
    const completed = {
      ...meta('completed'),
      title: 'Old completed task',
      status: 'done',
      priority: 0,
      tags: [],
      order: 1,
      reminders: [],
      checklist: [],
      dueAt: '2026-06-01T17:00:00.000Z',
      completedAt: '2026-06-02T17:00:00.000Z',
    } satisfies Task;

    expect(
      summarizeBriefing({
        tasks: [completed],
        today: '2026-07-03',
        routingIssues: 0,
        staleDomains: 0,
      }),
    ).toMatchObject({ todayTotal: 0, doneToday: 0, openToday: 0 });
  });

  it('ignores malformed scheduled calendar days', () => {
    const tasks = ['2026-07-02', '2026-02-30', '2026-07-02 ignore this'].map(
      (scheduledFor, index) =>
        ({
          ...meta(`scheduled-${index}`),
          title: `Scheduled ${index}`,
          status: 'todo',
          priority: 0,
          tags: [],
          order: index,
          reminders: [],
          checklist: [],
          scheduledFor,
        }) satisfies Task,
    );

    expect(
      summarizeBriefing({ tasks, today: '2026-07-03', routingIssues: 0, staleDomains: 0 }),
    ).toMatchObject({ todayTotal: 0, overdue: 1 });
  });
});
