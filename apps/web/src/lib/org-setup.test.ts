// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ensureOrgSetup,
  isDefaultOrganizationName,
  isLsgProjectName,
  SEED_ORG_ID,
} from './org-setup';

describe('organization setup name matching', () => {
  it('recognizes canonically equivalent portfolio project names', () => {
    expect(isLsgProjectName('Ｐｏｗｅｒ Dialer')).toBe(true);
    expect(isLsgProjectName('Blue Text')).toBe(true);
    expect(isLsgProjectName('Unrelated')).toBe(false);
  });

  it('recognizes canonically equivalent default organization names', () => {
    expect(isDefaultOrganizationName('ＬＳ Global Group')).toBe(true);
    expect(isDefaultOrganizationName('Other Organization')).toBe(false);
  });
});

// ---- ensureOrgSetup -------------------------------------------------------

interface SetupState {
  projects: Array<Record<string, unknown>>;
  organizations: Array<Record<string, unknown>>;
  tasks: Array<Record<string, unknown>>;
}

const state = vi.hoisted<() => SetupState>(() => {
  const value: SetupState = { projects: [], organizations: [], tasks: [] };
  return () => value;
});

const calls = vi.hoisted(() => ({
  createOrganization: vi.fn(),
  patchRecord: vi.fn(),
}));

vi.mock('@ops-dashboard/core', async () => {
  const actual = await vi.importActual<typeof import('@ops-dashboard/core')>('@ops-dashboard/core');
  return {
    ...actual,
    getDb: () => ({
      projects: { toArray: async () => state().projects },
      organizations: { toArray: async () => state().organizations },
      tasks: {
        where: () => ({
          equals: (projectId: string) => ({
            toArray: async () => state().tasks.filter((t) => t.projectId === projectId),
          }),
        }),
      },
    }),
  };
});

vi.mock('./organizations', () => ({ createOrganization: calls.createOrganization }));
vi.mock('./records', () => ({ patchRecord: calls.patchRecord }));

const GUARD_KEY = 'ops:org-setup-v1';

describe('ensureOrgSetup', () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.assign(state(), { projects: [], organizations: [], tasks: [] });
    calls.createOrganization.mockReset().mockImplementation(async (input: { id: string }) => ({
      ...input,
    }));
    calls.patchRecord.mockReset().mockResolvedValue(null);
  });

  it('records the guard without writing when nothing needs an org', async () => {
    state().projects = [{ id: 'p1', name: 'Unrelated' }];
    await ensureOrgSetup();
    expect(calls.createOrganization).not.toHaveBeenCalled();
    expect(calls.patchRecord).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(GUARD_KEY)).toBe('1');
  });

  it('does nothing once the guard is recorded', async () => {
    window.localStorage.setItem(GUARD_KEY, '1');
    state().projects = [{ id: 'p1', name: 'Blue Text' }];
    await ensureOrgSetup();
    expect(calls.createOrganization).not.toHaveBeenCalled();
    expect(calls.patchRecord).not.toHaveBeenCalled();
  });

  it('seeds the default org under the shared id and moves the project and its tasks', async () => {
    state().projects = [{ id: 'p1', name: 'Blue Text' }];
    state().tasks = [
      { id: 't1', projectId: 'p1' },
      { id: 't2', projectId: 'p2' },
    ];
    await ensureOrgSetup();
    expect(calls.createOrganization).toHaveBeenCalledWith(
      expect.objectContaining({ id: SEED_ORG_ID }),
    );
    expect(calls.patchRecord).toHaveBeenCalledWith('projects', 'p1', { orgId: SEED_ORG_ID });
    expect(calls.patchRecord).toHaveBeenCalledWith('tasks', 't1', { orgId: SEED_ORG_ID });
    expect(calls.patchRecord).not.toHaveBeenCalledWith('tasks', 't2', expect.anything());
    expect(window.localStorage.getItem(GUARD_KEY)).toBe('1');
  });

  it('reuses an existing default org instead of seeding a second one', async () => {
    state().projects = [{ id: 'p1', name: 'Blue Text' }];
    state().organizations = [{ id: 'org-existing', name: 'ＬＳ Global Group' }];
    await ensureOrgSetup();
    expect(calls.createOrganization).not.toHaveBeenCalled();
    expect(calls.patchRecord).toHaveBeenCalledWith('projects', 'p1', { orgId: 'org-existing' });
  });

  it('leaves a project that already has an org and skips deleted or claimed tasks', async () => {
    state().projects = [
      { id: 'p1', name: 'Blue Text', orgId: 'org-other' },
      { id: 'p2', name: 'Power Dialer' },
    ];
    state().tasks = [
      { id: 't1', projectId: 'p2', orgId: 'org-other' },
      { id: 't2', projectId: 'p2', deletedAt: '2026-01-01T00:00:00.000Z' },
      { id: 't3', projectId: 'p2' },
    ];
    await ensureOrgSetup();
    expect(calls.patchRecord).not.toHaveBeenCalledWith('projects', 'p1', expect.anything());
    expect(calls.patchRecord).toHaveBeenCalledWith('projects', 'p2', { orgId: SEED_ORG_ID });
    expect(calls.patchRecord).toHaveBeenCalledWith('tasks', 't3', { orgId: SEED_ORG_ID });
    for (const skipped of ['t1', 't2']) {
      expect(calls.patchRecord).not.toHaveBeenCalledWith('tasks', skipped, expect.anything());
    }
  });
});
