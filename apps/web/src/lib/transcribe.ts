'use client';

/** True when a server-side Whisper endpoint is configured for this build. */
export const whisperEnabled = process.env.NEXT_PUBLIC_TRANSCRIBE_ENABLED === '1';

/** Best audio mime type this browser can record for upload. */
export function pickAudioMime(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}

/** POST a recorded audio blob to /api/transcribe; returns the transcript or null. */
export async function transcribeBlob(blob: Blob): Promise<string | null> {
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
    const res = await fetch('/api/transcribe', { method: 'POST', body: form });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; text?: string } | null;
    if (json?.ok && typeof json.text === 'string' && json.text.trim()) return json.text.trim();
    return null;
  } catch {
    return null;
  }
}
