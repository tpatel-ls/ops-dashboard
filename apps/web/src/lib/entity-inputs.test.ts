import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  newRecord: vi.fn((value: object) => value),
  putRecord: vi.fn((table: string, value: object) => Promise.resolve({ table, ...value })),
}));

vi.mock('./records', () => ({
  newRecord: mocks.newRecord,
  putRecord: mocks.putRecord,
  patchRecord: vi.fn(),
  softDeleteRecord: vi.fn(),
}));

import { createDomain } from './domains';
import { createPerson } from './people';

beforeEach(() => vi.clearAllMocks());

describe('createDomain', () => {
  it('trims domain names before persistence', async () => {
    await createDomain({ name: '  Health  ', color: '#0a6' });

    expect(mocks.putRecord).toHaveBeenCalledWith(
      'domains',
      expect.objectContaining({ name: 'Health' }),
    );
  });

  it('rejects blank domain names before persistence', () => {
    expect(() => createDomain({ name: '   ', color: '#0a6' })).toThrow('Domain name is required');
    expect(mocks.putRecord).not.toHaveBeenCalled();
  });
});

describe('createPerson', () => {
  it('trims person names before persistence', async () => {
    await createPerson({ name: '  Avery Morgan  ' });

    expect(mocks.putRecord).toHaveBeenCalledWith(
      'people',
      expect.objectContaining({ name: 'Avery Morgan' }),
    );
  });

  it('rejects blank person names before persistence', () => {
    expect(() => createPerson({ name: '   ' })).toThrow('Person name is required');
    expect(mocks.putRecord).not.toHaveBeenCalled();
  });
});
