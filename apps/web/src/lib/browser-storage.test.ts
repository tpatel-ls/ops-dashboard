import { afterEach, describe, expect, it, vi } from 'vitest';
import { readLocalStorage, removeLocalStorage, writeLocalStorage } from './browser-storage';

afterEach(() => vi.unstubAllGlobals());

describe('browser storage helpers', () => {
  it('treats blocked storage reads as missing values', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => {
          throw new DOMException('blocked');
        },
      },
    });

    expect(readLocalStorage('sync-cursor')).toBeNull();
  });

  it('reports blocked storage writes without throwing', () => {
    vi.stubGlobal('window', {
      localStorage: {
        setItem: () => {
          throw new DOMException('quota exceeded');
        },
      },
    });

    expect(writeLocalStorage('sync-cursor', '{}')).toBe(false);
  });

  it('reports blocked storage removals without throwing', () => {
    vi.stubGlobal('window', {
      localStorage: {
        removeItem: () => {
          throw new DOMException('blocked');
        },
      },
    });

    expect(removeLocalStorage('recent-project')).toBe(false);
  });
});
