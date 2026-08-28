import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  putRecord: vi.fn(async (_table: string, record: unknown) => record),
}));

vi.mock('./records', async () => {
  const actual = await vi.importActual<typeof import('./records')>('./records');
  return {
    ...actual,
    newRecord: (fields: object) => ({
      id: 'content-test',
      createdAt: '2026-08-28T12:00:00.000Z',
      updatedAt: '2026-08-28T12:00:00.000Z',
      version: 1,
      deviceId: 'test',
      ...fields,
    }),
    putRecord: mocks.putRecord,
  };
});

import { compareContentOrder, createContent } from './content';

describe('content links', () => {
  beforeEach(() => mocks.putRecord.mockClear());

  it('accepts normalized absolute web links', async () => {
    await expect(
      createContent({ title: 'Launch post', url: '  https://example.test/post  ' }),
    ).resolves.toMatchObject({ url: 'https://example.test/post' });
  });

  it('keeps safe dashboard-relative links', async () => {
    await expect(createContent({ title: 'Launch post', url: '  /launch  ' })).resolves.toMatchObject(
      { url: '/launch' },
    );
  });

  it.each(['relative', '//example.test/path', 'javascript:alert(1)', 'https://user:secret@example.test'])(
    'rejects unsafe link %s',
    (url) => {
      expect(() => createContent({ title: 'Launch post', url })).toThrow('Content URL');
      expect(mocks.putRecord).not.toHaveBeenCalled();
    },
  );
});

describe('compareContentOrder', () => {
  it('uses title and id ties for stable pipeline ordering', () => {
    const items = [
      { id: 'z', title: 'Beta', order: 1 },
      { id: 'b', title: 'Alpha', order: 1 },
      { id: 'a', title: 'Alpha', order: 1 },
    ];

    expect(items.sort(compareContentOrder).map((item) => item.id)).toEqual(['a', 'b', 'z']);
  });

  it('puts malformed synced order values after valid items', () => {
    const items = [
      { id: 'invalid', title: 'Alpha', order: Number.NaN },
      { id: 'valid', title: 'Zulu', order: 2 },
    ];

    expect(items.sort(compareContentOrder).map((item) => item.id)).toEqual(['valid', 'invalid']);
  });
});
