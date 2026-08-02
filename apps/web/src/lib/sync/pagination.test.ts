import { describe, expect, it, vi } from 'vitest';
import { visitPullPages } from './pagination';

describe('visitPullPages', () => {
  it('continues beyond the first full server page', async () => {
    const rows = Array.from({ length: 1_001 }, (_, id) => ({ id }));
    const fetchPage = vi.fn(async ({ from, to }: { from: number; to: number }) =>
      rows.slice(from, to + 1),
    );
    const visited: number[] = [];

    await expect(
      visitPullPages(fetchPage, async (row) => void visited.push(row.id), 1_000),
    ).resolves.toBe(true);

    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage).toHaveBeenNthCalledWith(1, { from: 0, to: 999 });
    expect(fetchPage).toHaveBeenNthCalledWith(2, { from: 1_000, to: 1_999 });
    expect(visited).toHaveLength(1_001);
  });

  it('reports a failed page without visiting later rows', async () => {
    await expect(
      visitPullPages(
        async () => null,
        async () => {},
        1_000,
      ),
    ).resolves.toBe(false);
  });
});
