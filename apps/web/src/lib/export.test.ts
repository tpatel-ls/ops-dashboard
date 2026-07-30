import { describe, expect, it } from 'vitest';
import type { Task } from '@ops-dashboard/core';
import { tasksToMarkdown, validateOpsExport } from './export';

function task(title: string, scheduledFor?: string): Task {
  return {
    id: title,
    title,
    status: 'todo',
    priority: 0,
    tags: [],
    order: 0,
    reminders: [],
    checklist: [],
    createdAt: '2026-07-28T00:00:00.000Z',
    updatedAt: '2026-07-28T00:00:00.000Z',
    version: 1,
    deviceId: 'test',
    ...(scheduledFor ? { scheduledFor } : {}),
  };
}

describe('tasksToMarkdown', () => {
  it('groups malformed scheduled dates as unscheduled', () => {
    const markdown = tasksToMarkdown([task('Recover imported task', 'not-a-date')], 'Tasks');

    expect(markdown).toContain('## Unscheduled');
    expect(markdown).toContain('- [ ] Recover imported task');
  });

  it('formats valid scheduled dates', () => {
    const markdown = tasksToMarkdown([task('Tuesday task', '2026-07-28')], 'Tasks');

    expect(markdown).toContain('## Tuesday, July 28');
  });
});

describe('validateOpsExport', () => {
  it('rejects missing record collections before opening the database', () => {
    expect(() =>
      validateOpsExport({
        version: 1,
        exportedAt: '2026-07-30T12:00:00.000Z',
        tasks: [],
      }),
    ).toThrow('Invalid export projects');
  });

  it('rejects records without stable IDs', () => {
    expect(() =>
      validateOpsExport({
        version: 1,
        exportedAt: '2026-07-30T12:00:00.000Z',
        tasks: [{ title: 'Missing ID' }],
        projects: [],
        whiteboards: [],
      }),
    ).toThrow('Invalid export tasks');
  });

  it('accepts a structurally valid version one export', () => {
    const payload = {
      version: 1 as const,
      exportedAt: '2026-07-30T12:00:00.000Z',
      tasks: [task('Valid task')],
      projects: [],
      whiteboards: [],
    };

    expect(validateOpsExport(payload)).toBe(payload);
  });
});
