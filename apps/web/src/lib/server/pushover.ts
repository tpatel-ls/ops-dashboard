/** Server-only Pushover sender. No-ops (returns not-configured) without keys. */

export interface PushoverMessage {
  message: string;
  title?: string;
  priority?: -2 | -1 | 0 | 1 | 2;
  url?: string;
  urlTitle?: string;
}

export interface PushoverResult {
  ok: boolean;
  reason?: string;
}

export const PUSHOVER_TIMEOUT_MS = 10_000;

function bounded(value: string, limit: number): string {
  return Array.from(value.trim()).slice(0, limit).join('');
}

export async function sendPushover(msg: PushoverMessage): Promise<PushoverResult> {
  const token = process.env.PUSHOVER_TOKEN;
  const user = process.env.PUSHOVER_USER;
  if (!token || !user) return { ok: false, reason: 'not-configured' };
  const message = bounded(msg.message, 1024);
  if (!message) return { ok: false, reason: 'empty-message' };

  const body = new URLSearchParams({ token, user, message });
  const title = msg.title ? bounded(msg.title, 250) : '';
  if (title) body.set('title', title);
  if (msg.priority !== undefined) body.set('priority', String(msg.priority));
  const url = msg.url ? bounded(msg.url, 512) : '';
  const urlTitle = msg.urlTitle ? bounded(msg.urlTitle, 100) : '';
  if (url) body.set('url', url);
  if (urlTitle) body.set('url_title', urlTitle);

  try {
    const res = await fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(PUSHOVER_TIMEOUT_MS),
    });
    if (!res.ok) return { ok: false, reason: `http-${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'fetch-failed' };
  }
}
