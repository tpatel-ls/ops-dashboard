import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ create: vi.fn(), configured: true, allowed: true }));

vi.mock('@/lib/server/guard', () => ({ requestAllowed: vi.fn(async () => mocks.allowed) }));
vi.mock('@/lib/server/ai', () => ({
  getAnthropic: () => (mocks.configured ? { messages: { create: mocks.create } } : null),
  MODELS: { triage: 'triage-test' },
}));

import { POST } from '../../app/api/triage/route';

function triageRequest(body: unknown): Request {
  return new Request('https://dashboard.example/api/triage', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

afterEach(() => {
  mocks.create.mockReset();
  mocks.configured = true;
  mocks.allowed = true;
});

describe('triage API', () => {
  it('rejects an unauthorized request without calling the model', async () => {
    mocks.allowed = false;

    const response = await POST(triageRequest({ raw: 'Buy milk' }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ ok: false, reason: 'unauthorized' });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it.each(['null', 'not json', JSON.stringify({ raw: '   ' }), JSON.stringify({ raw: 7 })])(
    'rejects a %s body as empty without calling the model',
    async (body) => {
      const response = await POST(triageRequest(body));

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ ok: false, reason: 'empty' });
      expect(mocks.create).not.toHaveBeenCalled();
    },
  );

  it('reports missing AI configuration as service unavailability', async () => {
    mocks.configured = false;

    const response = await POST(triageRequest({ raw: 'Buy milk' }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ ok: false, reason: 'no-key' });
  });

  it('sends the trimmed capture, capped at 4000 characters, to the triage model', async () => {
    mocks.create.mockResolvedValue({ content: [] });

    await POST(triageRequest({ raw: `  ${'a'.repeat(4_100)}  ` }));

    const params = mocks.create.mock.calls[0]?.[0];
    expect(params?.model).toBe('triage-test');
    expect(params?.tool_choice).toEqual({ type: 'tool', name: 'route_capture' });
    expect(params?.messages?.[0]?.content).toBe('a'.repeat(4_000));
  });

  it('returns the normalized result from the tool call', async () => {
    mocks.create.mockResolvedValue({
      content: [
        { type: 'text', text: 'Routing it.' },
        {
          type: 'tool_use',
          name: 'route_capture',
          input: { kind: 'Mystery', title: ' Email Sam ', tags: ['Work', 'work'], priority: 9 },
        },
      ],
    });

    const response = await POST(triageRequest({ raw: 'um email sam' }));

    await expect(response.json()).resolves.toEqual({
      ok: true,
      result: { kind: 'task', title: 'Email Sam', tags: ['work'] },
    });
  });

  it('answers no-result when the model returns no usable title', async () => {
    mocks.create.mockResolvedValue({
      content: [{ type: 'tool_use', name: 'route_capture', input: { title: '   ' } }],
    });

    const response = await POST(triageRequest({ raw: 'hmm' }));

    await expect(response.json()).resolves.toEqual({ ok: false, reason: 'no-result' });
  });

  it('answers error instead of throwing when the provider call fails', async () => {
    mocks.create.mockRejectedValue(new Error('overloaded'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await POST(triageRequest({ raw: 'email sam' }));

    await expect(response.json()).resolves.toEqual({ ok: false, reason: 'error' });
  });
});
