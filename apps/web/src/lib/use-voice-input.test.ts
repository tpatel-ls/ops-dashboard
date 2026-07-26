// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useVoiceInput } from './use-voice-input';

const { transcribeBlobMock } = vi.hoisted(() => ({
  transcribeBlobMock: vi.fn(),
}));

vi.mock('./transcribe', () => ({
  pickAudioMime: () => 'audio/webm',
  transcribeBlob: transcribeBlobMock,
  whisperEnabled: true,
}));

class FakeMediaRecorder {
  static isTypeSupported() {
    return true;
  }

  state: RecordingState = 'inactive';
  mimeType = 'audio/webm';
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onstop: (() => void) | null = null;

  start() {
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['audio']) } as BlobEvent);
    this.onstop?.();
  }
}

function setMediaDevices(getUserMedia: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  });
  vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
}

afterEach(() => {
  transcribeBlobMock.mockReset();
  vi.unstubAllGlobals();
});

describe('useVoiceInput', () => {
  it('reports when microphone access is unavailable', async () => {
    setMediaDevices(vi.fn().mockRejectedValue(new Error('denied')));
    const { result } = renderHook(() => useVoiceInput({ onTranscript: vi.fn() }));

    act(() => result.current.toggle());

    await waitFor(() => {
      expect(result.current.error).toBe('Microphone access was not available.');
    });
  });

  it('reports when Whisper cannot produce a transcript', async () => {
    const stopTrack = vi.fn();
    setMediaDevices(
      vi.fn().mockResolvedValue({
        getTracks: () => [{ stop: stopTrack }],
      }),
    );
    transcribeBlobMock.mockResolvedValue(null);
    const { result } = renderHook(() => useVoiceInput({ onTranscript: vi.fn() }));

    act(() => result.current.toggle());
    await waitFor(() => expect(result.current.listening).toBe(true));
    act(() => result.current.toggle());

    await waitFor(() => {
      expect(result.current.error).toBe(
        'I could not transcribe that recording. Try again or type the task.',
      );
    });
    expect(stopTrack).toHaveBeenCalledOnce();
  });
});
