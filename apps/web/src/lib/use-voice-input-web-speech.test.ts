// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./transcribe', () => ({
  pickAudioMime: () => '',
  transcribeBlob: vi.fn(),
  whisperEnabled: false,
}));

afterEach(() => {
  delete (window as Window & { SpeechRecognition?: unknown }).SpeechRecognition;
  vi.resetModules();
});

describe('Web Speech voice input', () => {
  it('contains synchronous browser start failures', async () => {
    class BrokenRecognition {
      lang = '';
      continuous = false;
      interimResults = false;
      onresult = null;
      onerror = null;
      onend = null;
      start() {
        throw new DOMException('blocked', 'NotAllowedError');
      }
      stop() {}
      abort() {}
    }
    Object.defineProperty(window, 'SpeechRecognition', {
      configurable: true,
      value: BrokenRecognition,
    });
    const { useVoiceInput } = await import('./use-voice-input');
    const { result } = renderHook(() => useVoiceInput({ onTranscript: vi.fn() }));

    act(() => result.current.toggle());

    expect(result.current.listening).toBe(false);
    expect(result.current.error).toBe(
      'Voice input could not start. Check microphone access and try again.',
    );
  });
});
