import { NextResponse } from 'next/server';
import { sendPushover } from '@/lib/server/pushover';
import { requestAllowed } from '@/lib/server/guard';

export const runtime = 'nodejs';

const MAX_MESSAGE = 1024;
const MAX_TITLE = 250;

export async function POST(req: Request): Promise<Response> {
  if (!requestAllowed(req)) {
    return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
  }

  let body: { message?: unknown; title?: unknown; priority?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    /* ignore */
  }

  const message = (typeof body.message === 'string' ? body.message : '').slice(0, MAX_MESSAGE);
  if (!message) return NextResponse.json({ ok: false, reason: 'empty' }, { status: 400 });

  // Clamp priority to non-emergency levels (2 requires retry/expire; -2 silent).
  const priority: -1 | 0 | 1 = body.priority === 1 ? 1 : body.priority === -1 ? -1 : 0;

  const result = await sendPushover({
    message,
    ...(typeof body.title === 'string' ? { title: body.title.slice(0, MAX_TITLE) } : {}),
    priority,
  });
  return NextResponse.json({ ok: result.ok, ...(result.reason ? { reason: result.reason } : {}) });
}
