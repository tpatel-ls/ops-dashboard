export const MAX_TRANSCRIPTION_BYTES = 25 * 1024 * 1024;

export function transcriptionFileError(size: number): 'empty-file' | 'too-large' | undefined {
  if (size === 0) return 'empty-file';
  if (size > MAX_TRANSCRIPTION_BYTES) return 'too-large';
  return undefined;
}

export function transcriptionText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  return text || undefined;
}
