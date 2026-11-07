import { MAX_TRANSCRIPTION_BYTES, supportedTranscriptionType } from '../transcription-audio';

export { MAX_TRANSCRIPTION_BYTES };
export const MAX_TRANSCRIPTION_TEXT_LENGTH = 100_000;
export const TRANSCRIPTION_REQUEST_TIMEOUT_MS = 60_000;

export function transcriptionEndpoint(baseURL: string | undefined): string | undefined {
  const base = baseURL?.trim();
  if (!base) return undefined;
  try {
    const url = new URL(base);
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) ||
      url.username ||
      url.password
    ) {
      return undefined;
    }
    url.pathname = `${url.pathname.replace(/\/+$/, '')}/audio/transcriptions`;
    return url.toString();
  } catch {
    return undefined;
  }
}

export function transcriptionFileError(
  size: number,
  mediaType?: string,
): 'empty-file' | 'too-large' | 'unsupported-type' | undefined {
  if (!Number.isSafeInteger(size) || size <= 0) return 'empty-file';
  if (size > MAX_TRANSCRIPTION_BYTES) return 'too-large';
  if (mediaType && !supportedTranscriptionType(mediaType)) {
    return 'unsupported-type';
  }
  return undefined;
}

export function transcriptionText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = Array.from(value.trim()).slice(0, MAX_TRANSCRIPTION_TEXT_LENGTH).join('');
  return text || undefined;
}
