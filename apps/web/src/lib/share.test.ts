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

  it('normalizes clipboard text and rejects an empty payload', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    await expect(
      shareOrCopy({ title: ' Task ', text: ' Follow up ', url: ' https://example.test ' }),
    ).resolves.toBe('copied');
    expect(writeText).toHaveBeenCalledWith('Task\nFollow up\nhttps://example.test');

    writeText.mockClear();
    await expect(shareOrCopy({ title: ' ', text: ' ' })).resolves.toBe('failed');
    expect(writeText).not.toHaveBeenCalled();
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

  it('recognizes cancellation errors from non-DOM browser implementations', async () => {
    const writeText = vi.fn();
    const cancellation = Object.assign(new Error('cancelled'), { name: 'AbortError' });
    vi.stubGlobal('navigator', {
      share: vi.fn().mockRejectedValue(cancellation),
      clipboard: { writeText },
    });

    await expect(shareOrCopy({ title: 'Task', text: 'Follow up' })).resolves.toBe('failed');
    expect(writeText).not.toHaveBeenCalled();
  });
});
