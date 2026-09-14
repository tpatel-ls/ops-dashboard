import { afterEach, describe, expect, it, vi } from 'vitest';
import { readLocalStorage, removeLocalStorage, writeLocalStorage } from './browser-storage';

afterEach(() => vi.unstubAllGlobals());

describe('browser storage helpers', () => {
  it('returns safe defaults when window is unavailable', () => {
    vi.stubGlobal('window', undefined as never);

    expect(readLocalStorage('sync-token')).toBeNull();
    expect(writeLocalStorage('sync-token', '{}')).toBe(false);
    expect(removeLocalStorage('sync-token')).toBe(false);
  });

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

  it('returns success for supported write and delete operations', () => {
    const localStorage = {
      getItem: () => null,
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    vi.stubGlobal('window', { localStorage });

    expect(writeLocalStorage('key', 'value')).toBe(true);
    expect(removeLocalStorage('key')).toBe(true);
    expect(localStorage.setItem).toHaveBeenCalledWith('key', 'value');
    expect(localStorage.removeItem).toHaveBeenCalledWith('key');
  });

  it('returns null or false when localStorage methods are unavailable', () => {
    vi.stubGlobal('window', { localStorage: {} as Storage });

    expect(readLocalStorage('sync-token')).toBeNull();
    expect(writeLocalStorage('sync-token', '{}')).toBe(false);
    expect(removeLocalStorage('sync-token')).toBe(false);
  });
});
