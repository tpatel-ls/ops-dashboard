import { afterEach, describe, expect, it, vi } from 'vitest';
import { transcribeBlob } from './transcribe';

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
});
