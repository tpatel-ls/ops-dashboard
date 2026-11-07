/**
 * Upload rules shared by the recorder (`lib/transcribe.ts`) and
 * `/api/transcribe` (`lib/server/transcription.ts`). The browser checks a
 * recording before uploading it, so the two sides must agree: a type or size
 * the route rejects that the client let through would cost a full upload only
 * to fail, and one the client skipped would never reach Whisper at all.
 */
export const MAX_TRANSCRIPTION_BYTES = 25 * 1024 * 1024;

const TRANSCRIPTION_AUDIO_TYPES = new Set([
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

/** The media type without parameters, so `audio/webm;codecs=opus` reads as `audio/webm`. */
export function baseAudioType(mediaType: string): string {
  return mediaType.split(';', 1)[0]!.trim().toLowerCase();
}

export function supportedTranscriptionType(mediaType: string): boolean {
  return TRANSCRIPTION_AUDIO_TYPES.has(baseAudioType(mediaType));
}
