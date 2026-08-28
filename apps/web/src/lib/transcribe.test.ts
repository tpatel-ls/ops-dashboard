import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_TRANSCRIBE_BYTES, transcribeBlob, transcriptionFilename } from './transcribe';

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

  it('does not upload a blob with a non-audio media type', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);

    await expect(transcribeBlob(new Blob(['image'], { type: 'image/png' }))).resolves.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects transcript-shaped bodies from unsuccessful responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true, text: 'Do not accept this' }), {
          status: 502,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );

    await expect(transcribeBlob(new Blob(['audio'], { type: 'audio/webm' }))).resolves.toBeNull();
  });

  it('returns a trimmed transcript from a successful response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true, text: '  Call the customer  ' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );

    await expect(transcribeBlob(new Blob(['audio'], { type: 'audio/webm' }))).resolves.toBe(
      'Call the customer',
    );
  });

  it.each([
    ['audio/flac', 'audio.flac'],
    ['audio/m4a', 'audio.m4a'],
    ['audio/mp4', 'audio.mp4'],
    ['audio/mpeg', 'audio.mp3'],
    ['audio/ogg; codecs=opus', 'audio.ogg'],
    ['audio/x-wav', 'audio.wav'],
    ['audio/webm', 'audio.webm'],
  ])('uses a filename matching %s uploads', (mediaType, expected) => {
    expect(transcriptionFilename(mediaType)).toBe(expected);
  });
});
