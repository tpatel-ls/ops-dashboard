import { NextResponse } from 'next/server';
import { requestAllowed } from '@/lib/server/guard';
import {
  TRANSCRIPTION_REQUEST_TIMEOUT_MS,
  transcriptionEndpoint,
  transcriptionFileError,
  transcriptionText,
} from '@/lib/server/transcription';

export const runtime = 'nodejs';

/**
 * Speech-to-text proxy. Forwards an uploaded audio blob to a self-hosted
 * OpenAI-compatible Whisper endpoint (`TRANSCRIBE_BASE_URL/audio/transcriptions`).
 * Degrades gracefully: returns `{ ok:false, reason:'not-configured' }` when the
 * endpoint isn't set, so the client can fall back to on-device Web Speech.
 */
export async function POST(req: Request): Promise<Response> {
  if (!(await requestAllowed(req))) {
    return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
  }

  const endpoint = transcriptionEndpoint(process.env.TRANSCRIBE_BASE_URL);
  const key = process.env.TRANSCRIBE_API_KEY?.trim();
  const model = process.env.TRANSCRIBE_MODEL?.trim() || 'whisper-1';
  if (!endpoint) {
    return NextResponse.json(
      { ok: false, reason: 'not-configured' },
      { status: 503 },
    );
  }

  let file: Blob | null = null;
  try {
    const form = await req.formData();
    const f = form.get('file');
    if (f instanceof Blob) file = f;
  } catch {
    /* ignore malformed body */
  }
  if (!file) return NextResponse.json({ ok: false, reason: 'no-file' }, { status: 400 });
  const fileError = transcriptionFileError(file.size, file.type);
  if (fileError) {
    return NextResponse.json(
      { ok: false, reason: fileError },
      { status: fileError === 'too-large' ? 413 : fileError === 'unsupported-type' ? 415 : 400 },
    );
  }

  const filename = file instanceof File && file.name ? file.name : 'audio.webm';
  const upstream = new FormData();
  upstream.append('file', file, filename);
  upstream.append('model', model);
  upstream.append('response_format', 'json');

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: key ? { Authorization: `Bearer ${key}` } : undefined,
      body: upstream,
      signal: AbortSignal.timeout(TRANSCRIPTION_REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error('[api/transcribe] upstream', res.status);
      return NextResponse.json({ ok: false, reason: 'upstream' }, { status: 502 });
    }
    const data = (await res.json()) as { text?: unknown };
    const text = transcriptionText(data?.text);
    if (!text) return NextResponse.json({ ok: false, reason: 'no-result' }, { status: 502 });
    return NextResponse.json({ ok: true, text });
  } catch (err) {
    console.error('[api/transcribe] error:', err);
    return NextResponse.json({ ok: false, reason: 'error' }, { status: 502 });
  }
}
