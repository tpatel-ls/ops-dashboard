import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  requestAllowed: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/server/ai', () => ({
  getAnthropic: () => null,
  MODELS: { triage: 'test-model' },
}));
vi.mock('@/lib/server/guard', () => ({
  requestAllowed: mocks.requestAllowed,
  bearerSecretMatches: (authorization: string | null, secret: string | undefined) =>
    authorization === `Bearer ${secret}`,
}));
vi.mock('@/lib/server/timezone', () => ({ normalizeTimezoneOffset: () => undefined }));
vi.mock('@/lib/server/capture-time', () => ({ captureParserNow: () => new Date() }));
vi.mock('@/lib/server/input', () => ({
  boundedText: (value: unknown) => (typeof value === 'string' ? value.trim() : ''),
}));
vi.mock('@/lib/server/triage-result', () => ({ normalizeTriageResult: () => null }));
vi.mock('@/lib/journal-source', () => ({ journalEntrySource: (source: string) => source }));
vi.mock('@/lib/sync/mapping', () => ({
  SYNC_TABLES: { tasks: 'tasks', journalEntries: 'journal_entries' },
  toRow: vi.fn(),
}));
vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
  getSingleUserId: vi.fn(),
}));
vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn().mockResolvedValue(null) }));

import { MAX_ROUTED_TITLE_LENGTH } from '@/lib/brain-dump-result';
import { POST } from '../../app/api/capture/route';

afterEach(() => vi.unstubAllEnvs());

describe('capture API persistence', () => {
  it('does not acknowledge watch captures when persistence is unavailable', async () => {
    vi.stubEnv('OPS_API_SECRET', 'watch-secret');
    mocks.createAdminClient.mockReturnValue(null);
    const request = new Request('https://dashboard.example/api/capture', {
      method: 'POST',
      headers: {
        authorization: 'Bearer watch-secret',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ raw: 'Call the customer' }),
    });

    const response = await POST(request);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      reason: 'persistence-unavailable',
    });
  });

  it('keeps a long capture without AI within the task title limit', async () => {
    mocks.createAdminClient.mockReturnValue(null);
    const raw = `Call the customer about ${'the renewal '.repeat(100)}`.trim();
    const request = new Request('https://dashboard.example/api/capture', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ raw }),
    });

    const response = await POST(request);
    const body = (await response.json()) as { record: { title: string; notes?: string } };

    expect(Array.from(body.record.title).length).toBeLessThanOrEqual(MAX_ROUTED_TITLE_LENGTH);
    expect(raw.startsWith(body.record.title)).toBe(true);
    expect(body.record.notes).toBe(raw);
  });

  it('leaves a short capture without AI as its own title', async () => {
    mocks.createAdminClient.mockReturnValue(null);
    const request = new Request('https://dashboard.example/api/capture', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ raw: 'Call the customer' }),
    });

    const body = (await (await POST(request)).json()) as {
      record: { title: string; notes?: string };
    };

    expect(body.record.title).toBe('Call the customer');
    expect(body.record.notes).toBeUndefined();
  });
});
