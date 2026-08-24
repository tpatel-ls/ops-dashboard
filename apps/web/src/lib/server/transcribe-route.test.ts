import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/server/guard', () => ({ requestAllowed: vi.fn().mockResolvedValue(true) }));
vi.mock('@/lib/server/transcription', () => ({
  TRANSCRIPTION_REQUEST_TIMEOUT_MS: 60_000,
  transcriptionEndpoint: () => undefined,
  transcriptionFileError: vi.fn(),
  transcriptionText: vi.fn(),
}));

import { POST } from '../../app/api/transcribe/route';

describe('transcribe API configuration', () => {
  it('reports an unavailable service when no upstream is configured', async () => {
    const response = await POST(
      new Request('https://dashboard.example/api/transcribe', { method: 'POST' }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ ok: false, reason: 'not-configured' });
  });
});
