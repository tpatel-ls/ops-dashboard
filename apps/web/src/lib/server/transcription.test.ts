import { describe, expect, it } from 'vitest';
import {
  MAX_TRANSCRIPTION_BYTES,
  MAX_TRANSCRIPTION_TEXT_LENGTH,
  TRANSCRIPTION_REQUEST_TIMEOUT_MS,
  transcriptionEndpoint,
  transcriptionFileError,
  transcriptionText,
} from './transcription';

describe('transcription boundaries', () => {
  it('normalizes the configured upstream endpoint', () => {
    expect(transcriptionEndpoint(' https://speech.example.test/// ')).toBe(
      'https://speech.example.test/audio/transcriptions',
    );
    expect(transcriptionEndpoint('http://localhost:8000/v1')).toBe(
      'http://localhost:8000/v1/audio/transcriptions',
    );
    expect(transcriptionEndpoint('   ')).toBeUndefined();
  });

  it('rejects malformed or unsafe upstream endpoints', () => {
    expect(transcriptionEndpoint('speech.example.test')).toBeUndefined();
    expect(transcriptionEndpoint('file:///tmp/transcriptions')).toBeUndefined();
    expect(transcriptionEndpoint('https://user:secret@speech.example.test')).toBeUndefined();
    expect(transcriptionEndpoint('http://speech.example.test')).toBeUndefined();
  });

  it('keeps the upstream request deadline below the platform limit', () => {
    expect(TRANSCRIPTION_REQUEST_TIMEOUT_MS).toBe(60_000);
  });

  it('rejects empty and oversized audio', () => {
    expect(transcriptionFileError(0)).toBe('empty-file');
    expect(transcriptionFileError(-1)).toBe('empty-file');
    expect(transcriptionFileError(Number.NaN)).toBe('empty-file');
    expect(transcriptionFileError(1.5)).toBe('empty-file');
    expect(transcriptionFileError(MAX_TRANSCRIPTION_BYTES + 1)).toBe('too-large');
    expect(transcriptionFileError(MAX_TRANSCRIPTION_BYTES)).toBeUndefined();
  });

  it('rejects unsupported media types while allowing codec parameters', () => {
    expect(transcriptionFileError(100, 'text/plain')).toBe('unsupported-type');
    expect(transcriptionFileError(100, 'audio/webm;codecs=opus')).toBeUndefined();
    expect(transcriptionFileError(100, 'audio/mpeg')).toBeUndefined();
  });

  it('accepts only nonempty text results', () => {
    expect(transcriptionText('  spoken note  ')).toBe('spoken note');
    expect(transcriptionText('   ')).toBeUndefined();
    expect(transcriptionText({ text: 'wrong shape' })).toBeUndefined();
  });

  it('bounds unexpectedly large upstream transcripts', () => {
    expect(transcriptionText('a'.repeat(MAX_TRANSCRIPTION_TEXT_LENGTH + 1))).toHaveLength(
      MAX_TRANSCRIPTION_TEXT_LENGTH,
    );
  });
});
