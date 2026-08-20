'use client';

import { fetchWithTimeout } from './fetch-timeout';

/** True when a server-side Whisper endpoint is configured for this build. */
export const whisperEnabled = process.env.NEXT_PUBLIC_TRANSCRIBE_ENABLED === '1';
export const MAX_TRANSCRIBE_BYTES = 25 * 1024 * 1024;
const TRANSCRIBE_AUDIO_TYPES = new Set([
  'audio/flac',
  'audio/m4a',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
  'audio/x-m4a',
  'audio/x-wav',
]);

function supportedAudioType(mediaType: string): boolean {
  if (!mediaType) return true;
  return TRANSCRIBE_AUDIO_TYPES.has(mediaType.split(';', 1)[0]!.trim().toLowerCase());
}

/** Best audio mime type this browser can record for upload. */
export function pickAudioMime(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}

/** POST a recorded audio blob to /api/transcribe; returns the transcript or null. */
export async function transcribeBlob(blob: Blob): Promise<string | null> {
  if (blob.size === 0 || blob.size > MAX_TRANSCRIBE_BYTES || !supportedAudioType(blob.type)) {
    return null;
  }

  const ext = blob.type.includes('mp4')
    ? 'mp4'
    : blob.type.includes('ogg')
      ? 'ogg'
      : blob.type.includes('wav')
        ? 'wav'
        : 'webm';
  const form = new FormData();
  form.append('file', blob, `audio.${ext}`);
  try {
    const res = await fetchWithTimeout('/api/transcribe', { method: 'POST', body: form });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as { ok?: boolean; text?: string } | null;
    if (json?.ok && typeof json.text === 'string' && json.text.trim()) return json.text.trim();
    return null;
  } catch {
    return null;
  }
}
