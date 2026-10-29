import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_JOURNAL_IMAGE_BYTES } from './journal-image';

const mocks = vi.hoisted(() => ({ create: vi.fn(), configured: true }));

vi.mock('@/lib/server/guard', () => ({ requestAllowed: vi.fn().mockResolvedValue(true) }));
vi.mock('@/lib/server/ai', () => ({
  getAnthropic: () => (mocks.configured ? { messages: { create: mocks.create } } : null),
  MODELS: { vision: 'vision-test' },
}));

import { POST } from '../../app/api/journal/extract/route';

// The first bytes of a JPEG (FF D8 FF E0), padded to a valid base64 length.
const JPEG_BASE64 = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]).toString('base64');

function extractRequest(body: unknown): Request {
  return new Request('https://dashboard.example/api/journal/extract', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

afterEach(() => {
  mocks.create.mockReset();
  mocks.configured = true;
});

describe('journal extract API', () => {
  it.each(['null', 'not json', JSON.stringify({ text: '  ' })])(
    'rejects a %s body as empty',
    async (body) => {
      const response = await POST(extractRequest(body));

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ ok: false, reason: 'empty' });
    },
  );

  it('answers 413 image-too-large for a photo over the limit', async () => {
    // Whole base64 quads that decode to one byte past the limit.
    const oversized = 'A'.repeat((Math.floor(MAX_JOURNAL_IMAGE_BYTES / 3) + 1) * 4);

    const response = await POST(extractRequest({ imageBase64: oversized, mediaType: 'image/png' }));

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({ ok: false, reason: 'image-too-large' });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('answers 400 invalid-image-type for an unsupported format', async () => {
    const response = await POST(
      extractRequest({ imageBase64: JPEG_BASE64, mediaType: 'image/heic' }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, reason: 'invalid-image-type' });
  });

  it('answers 400 invalid-image when the bytes do not match the type', async () => {
    const response = await POST(
      extractRequest({ imageBase64: JPEG_BASE64, mediaType: 'image/png' }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, reason: 'invalid-image' });
  });

  it('reports missing AI configuration as service unavailability', async () => {
    mocks.configured = false;

    const response = await POST(extractRequest({ text: 'Went for a run.' }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ ok: false, reason: 'no-key' });
  });

  it('sends a valid photo to the vision model with the entry text', async () => {
    mocks.create.mockResolvedValue({ content: [] });

    const response = await POST(
      extractRequest({ imageBase64: JPEG_BASE64, mediaType: 'image/jpeg', text: 'Morning' }),
    );

    await expect(response.json()).resolves.toEqual({ ok: false, reason: 'no-result' });
    const request = mocks.create.mock.calls[0]?.[0];
    expect(request.model).toBe('vision-test');
    expect(request.messages[0].content).toEqual([
      {
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: JPEG_BASE64 },
      },
      { type: 'text', text: 'Morning' },
    ]);
  });
});
