import { NextResponse } from 'next/server';
import { sendPushover } from '@/lib/server/pushover';

export const runtime = 'nodejs';

export async function POST(req: Request): Promise<Response> {
  let body: {
    message?: unknown;
    title?: unknown;
    priority?: unknown;
    url?: unknown;
    urlTitle?: unknown;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    /* ignore */
  }
  const message = typeof body.message === 'string' ? body.message : '';
  if (!message) return NextResponse.json({ ok: false, reason: 'empty' }, { status: 400 });

  const result = await sendPushover({
    message,
    ...(typeof body.title === 'string' ? { title: body.title } : {}),
    ...(typeof body.priority === 'number'
      ? { priority: body.priority as -2 | -1 | 0 | 1 | 2 }
      : {}),
    ...(typeof body.url === 'string' ? { url: body.url } : {}),
    ...(typeof body.urlTitle === 'string' ? { urlTitle: body.urlTitle } : {}),
  });
  return NextResponse.json(result);
}
