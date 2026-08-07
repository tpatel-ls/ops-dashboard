import { afterEach, describe, expect, it, vi } from 'vitest';

const { importPortfolioProjects } = vi.hoisted(() => ({
  importPortfolioProjects: vi.fn().mockResolvedValue([]),
}));

vi.mock('./import-projects', () => ({
  LSG_LAUNCH_PROJECT_NAMES: ['Blue Text', 'Power Dialer'],
  importPortfolioProjects,
}));

import { ensureLsgWorkSetup } from './lsg-work-setup';

afterEach(() => vi.unstubAllGlobals());

describe('ensureLsgWorkSetup', () => {
  it('continues safely when browser storage is blocked', async () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => {
          throw new DOMException('blocked');
        },
        setItem: () => {
          throw new DOMException('blocked');
        },
      },
    });

    await expect(ensureLsgWorkSetup()).resolves.toBeUndefined();
    expect(importPortfolioProjects).toHaveBeenCalledWith(['Blue Text', 'Power Dialer']);
  });
});
