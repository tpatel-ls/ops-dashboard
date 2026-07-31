import { afterEach, describe, expect, it, vi } from 'vitest';
import { shareOrCopy } from './share';

afterEach(() => vi.unstubAllGlobals());

describe('shareOrCopy', () => {
  it('falls back to the clipboard when native sharing fails', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      share: vi.fn().mockRejectedValue(new Error('native share unavailable')),
      clipboard: { writeText },
    });

    await expect(shareOrCopy({ title: 'Task', text: 'Follow up' })).resolves.toBe('copied');
    expect(writeText).toHaveBeenCalledWith('Task\nFollow up');
  });

  it('does not copy after the user cancels the share sheet', async () => {
    const writeText = vi.fn();
    vi.stubGlobal('navigator', {
      share: vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError')),
      clipboard: { writeText },
    });

    await expect(shareOrCopy({ title: 'Task', text: 'Follow up' })).resolves.toBe('failed');
    expect(writeText).not.toHaveBeenCalled();
  });
});
