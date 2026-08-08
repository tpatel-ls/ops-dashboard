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

  it('keeps multiline titles and tags on one task line', () => {
    const multiline = task('First line\n## Injected heading');
    multiline.tags = ['work\nnotes'];

    const markdown = tasksToMarkdown([multiline], 'Tasks');

    expect(markdown).toContain('- [ ] First line ## Injected heading #work-notes');
    expect(markdown).not.toContain('\n## Injected heading');
  });

  it('omits deleted and archived tasks from readable exports', () => {
    const deleted = task('Deleted task');
    deleted.deletedAt = '2026-08-01T12:00:00.000Z';
    const archived = task('Archived task');
    archived.status = 'archived';

    const markdown = tasksToMarkdown([task('Active task'), deleted, archived], 'Tasks');

    expect(markdown).toContain('Active task');
    expect(markdown).not.toContain('Deleted task');
    expect(markdown).not.toContain('Archived task');
  });
});

describe('validateOpsExport', () => {
  it('rejects missing or malformed export timestamps', () => {
    const base = { version: 1, tasks: [], projects: [], whiteboards: [] };

    expect(() => validateOpsExport(base)).toThrow('Invalid export timestamp');
    expect(() => validateOpsExport({ ...base, exportedAt: 'not-a-timestamp' })).toThrow(
      'Invalid export timestamp',
    );
  });

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

  it('rejects duplicate IDs before bulk import can overwrite records', () => {
    const duplicate = task('Duplicate task');
    expect(() =>
      validateOpsExport({
        version: 1,
        exportedAt: '2026-07-30T12:00:00.000Z',
        tasks: [duplicate, { ...duplicate }],
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
