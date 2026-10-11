import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ create: vi.fn(), configured: true }));

vi.mock('@/lib/server/guard', () => ({ requestAllowed: vi.fn().mockResolvedValue(true) }));
vi.mock('@/lib/server/input', () => ({
  boundedText: (value: unknown) => (typeof value === 'string' ? value.trim() : ''),
}));
vi.mock('@/lib/server/ai', () => ({
  getAnthropic: () => (mocks.configured ? { messages: { create: mocks.create } } : null),
  MODELS: { chat: 'chat-test' },
}));

import { POST } from '../../app/api/chat/route';

afterEach(() => {
  mocks.configured = true;
});

describe('chat API response', () => {
  it('joins every provider text block into the answer', async () => {
    mocks.create.mockResolvedValue({
      content: [
        { type: 'text', text: 'First finding.' },
        { type: 'server_tool_use', id: 'tool-1' },
        { type: 'text', text: 'Second finding.' },
      ],
    });

    const response = await POST(
      new Request('https://dashboard.example/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: 'What changed?', context: 'Two updates.' }),
      }),
    );

    await expect(response.json()).resolves.toEqual({
      ok: true,
      answer: 'First finding.\nSecond finding.',
    });
  });

  it('rejects provider responses containing only blank text', async () => {
    mocks.create.mockResolvedValue({ content: [{ type: 'text', text: '   ' }] });

    const response = await POST(
      new Request('https://dashboard.example/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: 'What changed?' }),
      }),
    );

    await expect(response.json()).resolves.toEqual({ ok: false, reason: 'no-result' });
  });

  it('reports missing AI configuration as service unavailability', async () => {
    mocks.configured = false;

    const response = await POST(
      new Request('https://dashboard.example/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: 'What changed?' }),
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ ok: false, reason: 'no-key' });
  });
});
