import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  toArray: vi.fn(),
  newRecord: vi.fn((fields: Record<string, unknown>) => ({
    ...fields,
    id: 'org-test',
    createdAt: '2026-07-15T12:00:00.000Z',
    updatedAt: '2026-07-15T12:00:00.000Z',
    version: 1,
    deviceId: 'device-test',
  })),
  putRecord: vi.fn(async (_table: string, record: unknown) => record),
  patchRecord: vi.fn(),
}));

vi.mock('@ops-dashboard/core', async () => {
  const actual = await vi.importActual<typeof import('@ops-dashboard/core')>('@ops-dashboard/core');
  return {
    ...actual,
    getDb: () => ({ organizations: { toArray: mocks.toArray } }),
  };
});

vi.mock('./records', () => ({
  newRecord: mocks.newRecord,
  putRecord: mocks.putRecord,
  patchRecord: mocks.patchRecord,
  softDeleteRecord: vi.fn(),
}));

import { createOrganization, updateOrganization } from './organizations';

describe('createOrganization', () => {
  beforeEach(() => {
    mocks.toArray.mockReset().mockResolvedValue([]);
    mocks.newRecord.mockClear();
    mocks.putRecord.mockClear();
    mocks.patchRecord.mockClear();
  });

  it('trims the organization name before writing', async () => {
    const organization = await createOrganization({ name: '  LS Global  ' });

    expect(organization.name).toBe('LS Global');
    expect(mocks.putRecord).toHaveBeenCalledWith('organizations', organization);
  });

  it('rejects blank organization names before writing', async () => {
    await expect(createOrganization({ name: '  ' })).rejects.toThrow(
      'Organization name is required',
    );
    expect(mocks.putRecord).not.toHaveBeenCalled();
  });

  it('rejects duplicate active organization names case-insensitively', async () => {
    mocks.toArray.mockResolvedValue([{ id: 'org-existing', name: 'LS Global', order: 1 }]);

    await expect(createOrganization({ name: '  ls GLOBAL  ' })).rejects.toThrow(
      'Organization already exists',
    );
    expect(mocks.putRecord).not.toHaveBeenCalled();
  });

  it('allows reusing a name from an archived organization', async () => {
    mocks.toArray.mockResolvedValue([
      { id: 'org-archived', name: 'Former Client', order: 1, archivedAt: '2026-07-01' },
    ]);

    const organization = await createOrganization({ name: 'Former Client' });

    expect(organization.name).toBe('Former Client');
  });

  it('validates deterministic ids and ordering values', async () => {
    await expect(createOrganization({ id: '   ', name: 'Acme' })).rejects.toThrow(
      'Organization id is required',
    );
    await expect(createOrganization({ name: 'Acme', order: Number.NaN })).rejects.toThrow(
      'Organization order must be finite',
    );
    expect(mocks.putRecord).not.toHaveBeenCalled();
  });

  it('does not overwrite a different organization with a deterministic id', async () => {
    mocks.toArray.mockResolvedValue([{ id: 'seed-org', name: 'Existing Org', order: 1 }]);

    await expect(
      createOrganization({ id: 'seed-org', name: 'Replacement Org' }),
    ).rejects.toThrow('Organization id already exists');
    expect(mocks.putRecord).not.toHaveBeenCalled();
  });
});

describe('updateOrganization', () => {
  beforeEach(() => {
    mocks.toArray.mockReset().mockResolvedValue([
      { id: 'org-1', name: 'Acme', order: 1 },
      { id: 'org-2', name: 'Globex', order: 2 },
    ]);
    mocks.patchRecord.mockClear();
  });

  it('rejects a rename that duplicates another active organization', async () => {
    await expect(updateOrganization('org-1', { name: '  GLOBEX  ' })).rejects.toThrow(
      'Organization already exists',
    );
    expect(mocks.patchRecord).not.toHaveBeenCalled();
  });

  it('allows retaining the current normalized organization name', async () => {
    await updateOrganization('org-1', { name: '  Acme  ' });

    expect(mocks.patchRecord).toHaveBeenCalledWith('organizations', 'org-1', { name: 'Acme' });
  });
});
