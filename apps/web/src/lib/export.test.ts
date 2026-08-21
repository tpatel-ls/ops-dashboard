import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Project, Task, Whiteboard } from '@ops-dashboard/core';
import { releaseDownloadUrl, tasksToMarkdown, validateOpsExport } from './export';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

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

function project(name: string): Project {
  return {
    id: name,
    name,
    color: '#123456',
    kind: 'project',
    status: 'active',
    milestones: [],
    checklists: [],
    createdAt: '2026-07-28T00:00:00.000Z',
    updatedAt: '2026-07-28T00:00:00.000Z',
    version: 1,
    deviceId: 'test',
  };
}

function whiteboard(name: string): Whiteboard {
  return {
    id: name,
    name,
    document: null,
    linkedTaskIds: [],
    createdAt: '2026-07-28T00:00:00.000Z',
    updatedAt: '2026-07-28T00:00:00.000Z',
    version: 1,
    deviceId: 'test',
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

  it('rejects blank or padded record IDs', () => {
    const base = {
      version: 1 as const,
      exportedAt: '2026-07-30T12:00:00.000Z',
      projects: [],
      whiteboards: [],
    };

    expect(() => validateOpsExport({ ...base, tasks: [{ id: '   ' }] })).toThrow(
      'Invalid export tasks',
    );
    expect(() => validateOpsExport({ ...base, tasks: [{ id: ' task-1 ' }] })).toThrow(
      'Invalid export tasks',
    );
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

  it('rejects malformed task fields and nested collections', () => {
    const invalid = { ...task('Invalid task'), tags: [42] };

    expect(() =>
      validateOpsExport({
        version: 1,
        exportedAt: '2026-07-30T12:00:00.000Z',
        tasks: [invalid],
        projects: [],
        whiteboards: [],
      }),
    ).toThrow('Invalid export tasks');
  });

  it('rejects blank task checklist items', () => {
    const invalid = {
      ...task('Invalid checklist'),
      checklist: [{ id: 'item-1', text: '   ', done: false }],
    };

    expect(() =>
      validateOpsExport({
        version: 1,
        exportedAt: '2026-07-30T12:00:00.000Z',
        tasks: [invalid],
        projects: [],
        whiteboards: [],
      }),
    ).toThrow('Invalid export tasks');
  });

  it('rejects malformed optional task scheduling and recurrence fields', () => {
    const base = {
      version: 1 as const,
      exportedAt: '2026-07-30T12:00:00.000Z',
      projects: [],
      whiteboards: [],
    };

    expect(() =>
      validateOpsExport({ ...base, tasks: [{ ...task('Bad day'), scheduledFor: '2026-02-30' }] }),
    ).toThrow('Invalid export tasks');
    expect(() =>
      validateOpsExport({
        ...base,
        tasks: [
          { ...task('Bad recurrence'), recurrence: { freq: 'weekly', interval: 0 } },
        ],
      }),
    ).toThrow('Invalid export tasks');
  });

  it('rejects malformed optional project planning fields', () => {
    expect(() =>
      validateOpsExport({
        version: 1,
        exportedAt: '2026-07-30T12:00:00.000Z',
        tasks: [],
        projects: [{ ...project('Bad project'), dueDate: '2026-02-30' }],
        whiteboards: [],
      }),
    ).toThrow('Invalid export projects');
  });

  it('rejects malformed project and whiteboard structures', () => {
    const base = {
      version: 1 as const,
      exportedAt: '2026-07-30T12:00:00.000Z',
      tasks: [],
    };

    expect(() =>
      validateOpsExport({
        ...base,
        projects: [{ ...project('Invalid project'), milestones: [null] }],
        whiteboards: [],
      }),
    ).toThrow('Invalid export projects');
    expect(() =>
      validateOpsExport({
        ...base,
        projects: [],
        whiteboards: [{ ...whiteboard('Invalid board'), linkedTaskIds: [42] }],
      }),
    ).toThrow('Invalid export whiteboards');
  });

  it('rejects malformed sync metadata on imported records', () => {
    expect(() =>
      validateOpsExport({
        version: 1,
        exportedAt: '2026-07-30T12:00:00.000Z',
        tasks: [{ ...task('Invalid version'), version: Number.NaN }],
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
      projects: [project('Valid project')],
      whiteboards: [whiteboard('Valid board')],
    };

    expect(validateOpsExport(payload)).toBe(payload);
  });
});

describe('releaseDownloadUrl', () => {
  it('keeps blob URLs alive until the browser starts the download', () => {
    vi.useFakeTimers();
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('window', globalThis);
    vi.stubGlobal('URL', { revokeObjectURL });

    releaseDownloadUrl('blob:download');

    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:download');
  });
});
