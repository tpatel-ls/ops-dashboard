export const MAX_TRANSCRIPTION_BYTES = 25 * 1024 * 1024;
export const MAX_TRANSCRIPTION_TEXT_LENGTH = 100_000;
export const TRANSCRIPTION_REQUEST_TIMEOUT_MS = 60_000;

const AUDIO_TYPES = new Set([
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

export function transcriptionFileError(
  size: number,
  mediaType?: string,
): 'empty-file' | 'too-large' | 'unsupported-type' | undefined {
  if (!Number.isSafeInteger(size) || size <= 0) return 'empty-file';
  if (size > MAX_TRANSCRIPTION_BYTES) return 'too-large';
  if (mediaType && !AUDIO_TYPES.has(mediaType.split(';', 1)[0]!.trim().toLowerCase())) {
    return 'unsupported-type';
  }
  return undefined;
}

export function transcriptionText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = Array.from(value.trim()).slice(0, MAX_TRANSCRIPTION_TEXT_LENGTH).join('');
  return text || undefined;
}
