import { describe, expect, it } from 'vitest';
import {
  MAX_TRANSCRIPTION_BYTES,
  transcriptionFileError,
  transcriptionText,
} from './transcription';

describe('transcription boundaries', () => {
  it('rejects empty and oversized audio', () => {
    expect(transcriptionFileError(0)).toBe('empty-file');
    expect(transcriptionFileError(MAX_TRANSCRIPTION_BYTES + 1)).toBe('too-large');
    expect(transcriptionFileError(MAX_TRANSCRIPTION_BYTES)).toBeUndefined();
  });

  it('accepts only nonempty text results', () => {
    expect(transcriptionText('  spoken note  ')).toBe('spoken note');
    expect(transcriptionText('   ')).toBeUndefined();
    expect(transcriptionText({ text: 'wrong shape' })).toBeUndefined();
  });
});
