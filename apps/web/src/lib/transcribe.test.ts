import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_TRANSCRIBE_BYTES, transcribeBlob } from './transcribe';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('transcribeBlob', () => {
  it('does not upload an empty recording', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);

    await expect(transcribeBlob(new Blob([], { type: 'audio/webm' }))).resolves.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not upload a recording the server will reject', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const oversized = { size: MAX_TRANSCRIBE_BYTES + 1, type: 'audio/webm' } as Blob;

    await expect(transcribeBlob(oversized)).resolves.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});
