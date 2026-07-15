import { describe, expect, it } from 'vitest';
import type { Project } from '@ops-dashboard/core';
import {
  destinationOrgId,
  destinationForProject,
  projectsForDestination,
  resolveWorkDestination,
  syncSaveMessage,
  validWorkMinutes,
} from './work-logger';

function project(id: string, orgId?: string): Project {
  const now = '2026-07-14T12:00:00.000Z';
  return {
    id,
    name: id,
    color: '#fff',
    kind: 'project',
    status: 'active',
    ...(orgId ? { orgId } : {}),
    milestones: [],
    checklists: [],
    createdAt: now,
    updatedAt: now,
    version: 1,
    deviceId: 'test',
  };
}

describe('resolveWorkDestination', () => {
  it('uses a concrete active context before the last destination', () => {
    expect(resolveWorkDestination('org-a', 'personal', ['org-a'])).toBe('org-a');
  });

  it('uses the last valid destination from the All context', () => {
    expect(resolveWorkDestination('all', 'org-a', ['org-a'])).toBe('org-a');
  });

  it('falls back to Personal when the last organization is inactive', () => {
    expect(resolveWorkDestination('all', 'missing', ['org-a'])).toBe('personal');
  });
});

describe('destination helpers', () => {
  it('derives the destination from a preselected project', () => {
    expect(destinationForProject(project('org-project', 'org-a'))).toBe('org-a');
    expect(destinationForProject(project('personal-project'))).toBe('personal');
  });

  it('maps Personal to an absent orgId', () => {
    expect(destinationOrgId('personal')).toBeUndefined();
    expect(destinationOrgId('org-a')).toBe('org-a');
  });

  it('returns only active projects in the selected destination', () => {
    const personal = project('personal');
    const orgA = project('org-a-project', 'org-a');
    const orgB = project('org-b-project', 'org-b');
    orgA.archivedAt = '2026-07-14T13:00:00.000Z';

    expect(projectsForDestination([personal, orgA, orgB], 'personal')).toEqual([personal]);
    expect(projectsForDestination([personal, orgA, orgB], 'org-a')).toEqual([]);
    expect(projectsForDestination([personal, orgA, orgB], 'org-b')).toEqual([orgB]);
  });
});

describe('syncSaveMessage', () => {
  it('distinguishes synced, queued, and signed-out saves', () => {
    expect(syncSaveMessage('live', 0)).toBe('Saved and synced');
    expect(syncSaveMessage('live', 1)).toBe('Saved - syncing now');
    expect(syncSaveMessage('offline', 1)).toBe('Saved offline - sync queued');
    expect(syncSaveMessage('signed-out', 0)).toBe('Saved on this device - sign in to sync');
  });
});

describe('validWorkMinutes', () => {
  it('accepts whole-minute values from one minute through one day', () => {
    expect(validWorkMinutes(1)).toBe(true);
    expect(validWorkMinutes(1440)).toBe(true);
  });

  it('rejects zero, fractions, non-numbers, and values over one day', () => {
    expect(validWorkMinutes(0)).toBe(false);
    expect(validWorkMinutes(1.5)).toBe(false);
    expect(validWorkMinutes(Number.NaN)).toBe(false);
    expect(validWorkMinutes(1441)).toBe(false);
  });
});
