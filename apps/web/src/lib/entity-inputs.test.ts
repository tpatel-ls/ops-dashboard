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
import { createBook } from './books';
import { createPerson } from './people';
import { createQuote } from './quotes';

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

describe('createBook', () => {
  it('trims book titles before persistence', async () => {
    await createBook({ title: '  The Checklist Manifesto  ' });

    expect(mocks.putRecord).toHaveBeenCalledWith(
      'books',
      expect.objectContaining({ title: 'The Checklist Manifesto' }),
    );
  });

  it('rejects blank book titles before persistence', () => {
    expect(() => createBook({ title: '   ' })).toThrow('Book title is required');
    expect(mocks.putRecord).not.toHaveBeenCalled();
  });
});

describe('createQuote', () => {
  it('trims quote text before persistence', async () => {
    await createQuote({ text: '  Make it work, then make it better.  ' });

    expect(mocks.putRecord).toHaveBeenCalledWith(
      'quotes',
      expect.objectContaining({ text: 'Make it work, then make it better.' }),
    );
  });

  it('rejects blank quote text before persistence', () => {
    expect(() => createQuote({ text: '   ' })).toThrow('Quote text is required');
    expect(mocks.putRecord).not.toHaveBeenCalled();
  });
});
