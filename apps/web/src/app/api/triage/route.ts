import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { getAnthropic, MODELS } from '@/lib/server/ai';
import { requestAllowed } from '@/lib/server/guard';
import { boundedText } from '@/lib/server/input';
import { triageRequest } from '@/lib/server/triage-request';
import { normalizeTriageResult } from '@/lib/server/triage-result';

export const runtime = 'nodejs';

const MAX_RAW = 4000;

export async function POST(req: Request): Promise<Response> {
  if (!(await requestAllowed(req))) {
    return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
  }

  let raw = '';
  try {
    const body = (await req.json()) as { raw?: unknown };
    raw = boundedText(body?.raw, MAX_RAW);
  } catch {
    /* ignore malformed body */
  }
  if (!raw) return NextResponse.json({ ok: false, reason: 'empty' }, { status: 400 });
  const client = getAnthropic();
  if (!client) return NextResponse.json({ ok: false, reason: 'no-key' }, { status: 503 });

  try {
    const resp = await client.messages.create(triageRequest(raw, MODELS.triage));
    const toolUse = resp.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    const result = normalizeTriageResult(toolUse?.input);
    if (!result) return NextResponse.json({ ok: false, reason: 'no-result' });
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error('[api/triage] error:', err);
    return NextResponse.json({ ok: false, reason: 'error' });
  }
}
