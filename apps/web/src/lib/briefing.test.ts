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
      },
    ] satisfies Task[];

    expect(summarizeBriefing({ tasks, today: '2026-07-03', routingIssues: 2, staleDomains: 1 })).toEqual({
      todayTotal: 3,
      doneToday: 1,
      openToday: 2,
      overdue: 1,
      routingIssues: 2,
      staleDomains: 1,
    });
  });
});
