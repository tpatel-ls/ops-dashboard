import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  newRecord: vi.fn((fields: Record<string, unknown>) => ({
    ...fields,
    id: 'org-test',
    createdAt: '2026-07-15T12:00:00.000Z',
    updatedAt: '2026-07-15T12:00:00.000Z',
    version: 1,
    deviceId: 'device-test',
  })),
  putRecord: vi.fn(async (_table: string, record: unknown) => record),
}));

vi.mock('./records', () => ({
  newRecord: mocks.newRecord,
  putRecord: mocks.putRecord,
  patchRecord: vi.fn(),
  softDeleteRecord: vi.fn(),
}));

import { createOrganization } from './organizations';

describe('createOrganization', () => {
  beforeEach(() => {
    mocks.newRecord.mockClear();
    mocks.putRecord.mockClear();
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
});
