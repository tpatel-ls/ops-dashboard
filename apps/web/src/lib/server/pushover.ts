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

export async function sendPushover(msg: PushoverMessage): Promise<PushoverResult> {
  const token = process.env.PUSHOVER_TOKEN;
  const user = process.env.PUSHOVER_USER;
  if (!token || !user) return { ok: false, reason: 'not-configured' };

  const body = new URLSearchParams({ token, user, message: msg.message });
  if (msg.title) body.set('title', msg.title);
  if (msg.priority !== undefined) body.set('priority', String(msg.priority));
  if (msg.url) body.set('url', msg.url);
  if (msg.urlTitle) body.set('url_title', msg.urlTitle);

  try {
    const res = await fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST',
      body,
    });
    if (!res.ok) return { ok: false, reason: `http-${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'fetch-failed' };
  }
}
