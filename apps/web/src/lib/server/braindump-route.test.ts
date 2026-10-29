import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ create: vi.fn(), configured: true }));

vi.mock('@/lib/server/guard', () => ({ requestAllowed: vi.fn().mockResolvedValue(true) }));
vi.mock('@/lib/server/ai', () => ({
  getAnthropic: () => (mocks.configured ? { messages: { create: mocks.create } } : null),
  MODELS: { triage: 'triage-test' },
}));

import { POST } from '../../app/api/braindump/route';

function braindumpRequest(body: unknown): Request {
  return new Request('https://dashboard.example/api/braindump', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

afterEach(() => {
  mocks.create.mockReset();
  mocks.configured = true;
});

describe('braindump API', () => {
  it.each(['null', 'not json', JSON.stringify({ text: '   ' })])(
    'rejects a %s body as empty without calling the model',
    async (body) => {
      const response = await POST(braindumpRequest(body));

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ ok: false, reason: 'empty' });
      expect(mocks.create).not.toHaveBeenCalled();
    },
  );

  it('reports missing AI configuration as service unavailability', async () => {
    mocks.configured = false;

    const response = await POST(braindumpRequest({ text: 'Buy milk' }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ ok: false, reason: 'no-key' });
  });

  it('sends only the cleaned project, routine, and date context to the model', async () => {
    mocks.create.mockResolvedValue({ content: [] });

    await POST(
      braindumpRequest({
        text: 'Ran 5k and need to email Sam',
        context: {
          projects: [' Launch ', 'Launch', '', 7],
          routines: ['Run'],
          date: '2026-02-30',
        },
      }),
    );

    const content = mocks.create.mock.calls[0]?.[0]?.messages?.[0]?.content as string;
    // An invalid calendar day is dropped rather than passed on as "today".
    expect(content).not.toContain("Today's date");
    expect(content).toContain('Active project names: ["Launch"]');
    expect(content).toContain('Active routine names: ["Run"]');
    expect(content).toContain('Capture:\nRan 5k and need to email Sam');
  });

  it('returns the normalized items from the tool call', async () => {
    mocks.create.mockResolvedValue({
      content: [
        {
          type: 'tool_use',
          name: 'route_items',
          input: { items: [{ kind: 'task', title: ' Email Sam ' }, { title: '   ' }] },
        },
      ],
    });

    const response = await POST(braindumpRequest({ text: 'email sam' }));

    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      items: [{ kind: 'task', title: 'Email Sam' }],
    });
  });

  it('answers no-result when the model returns no usable items', async () => {
    mocks.create.mockResolvedValue({
      content: [{ type: 'tool_use', name: 'route_items', input: { items: [{ title: '' }] } }],
    });

    const response = await POST(braindumpRequest({ text: 'hmm' }));

    await expect(response.json()).resolves.toEqual({ ok: false, reason: 'no-result' });
  });

  it('answers error instead of throwing when the provider call fails', async () => {
    mocks.create.mockRejectedValue(new Error('overloaded'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await POST(braindumpRequest({ text: 'email sam' }));

    await expect(response.json()).resolves.toEqual({ ok: false, reason: 'error' });
  });
});
