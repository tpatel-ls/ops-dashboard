'use client';

import { fetchWithTimeout } from './fetch-timeout';
import {
  baseAudioType,
  MAX_TRANSCRIPTION_BYTES,
  supportedTranscriptionType,
} from './transcription-audio';

/** True when a server-side Whisper endpoint is configured for this build. */
export const whisperEnabled = process.env.NEXT_PUBLIC_TRANSCRIBE_ENABLED === '1';
export const MAX_TRANSCRIBE_BYTES = MAX_TRANSCRIPTION_BYTES;

function supportedAudioType(mediaType: string): boolean {
  return !mediaType || supportedTranscriptionType(mediaType);
}

export function transcriptionFilename(mediaType: string): string {
  const normalized = baseAudioType(mediaType);
  const extension =
    normalized === 'audio/flac'
      ? 'flac'
      : normalized === 'audio/m4a' || normalized === 'audio/x-m4a'
        ? 'm4a'
        : normalized === 'audio/mp4'
          ? 'mp4'
          : normalized === 'audio/mpeg'
            ? 'mp3'
            : normalized === 'audio/ogg'
              ? 'ogg'
              : normalized === 'audio/wav' || normalized === 'audio/x-wav'
                ? 'wav'
                : 'webm';
  return `audio.${extension}`;
}

/** Recording formats in order of preference; each must be one the route accepts. */
export const RECORDING_MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg',
] as const;

/** Best audio mime type this browser can record for upload. */
export function pickAudioMime(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  return RECORDING_MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}

/** POST a recorded audio blob to /api/transcribe; returns the transcript or null. */
export async function transcribeBlob(blob: Blob): Promise<string | null> {
  if (blob.size === 0 || blob.size > MAX_TRANSCRIBE_BYTES || !supportedAudioType(blob.type)) {
    return null;
  }

  const form = new FormData();
  form.append('file', blob, transcriptionFilename(blob.type));
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
