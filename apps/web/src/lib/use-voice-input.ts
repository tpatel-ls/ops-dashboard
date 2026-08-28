'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { pickAudioMime, transcribeBlob, whisperEnabled } from './transcribe';

// Minimal Web Speech API typings (not in the TS DOM lib).
interface SpeechRecognitionEventLike {
  results: ReadonlyArray<ReadonlyArray<{ transcript: string }>>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

// Feature-detect WebKit Speech Recognition (Chrome / Safari)
const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? (
        window as unknown as {
          SpeechRecognition?: SpeechRecognitionCtor;
          webkitSpeechRecognition?: SpeechRecognitionCtor;
        }
      ).SpeechRecognition ||
      (
        window as unknown as {
          SpeechRecognition?: SpeechRecognitionCtor;
          webkitSpeechRecognition?: SpeechRecognitionCtor;
        }
      ).webkitSpeechRecognition
    : undefined;

const MAX_RECORD_MS = 60_000;

const emptySubscribe = () => () => {};

export interface UseVoiceInputOptions {
  /** Called with the trimmed, non-empty transcript when a take completes. */
  onTranscript: (text: string) => void;
}

export interface VoiceInput {
  /** Mic is renderable: mounted on the client and some speech path exists. */
  available: boolean;
  listening: boolean;
  transcribing: boolean;
  error: string | null;
  toggle: () => void;
}

/**
 * One shared mic implementation for every capture surface. Prefers the
 * server Whisper path (record -> /api/transcribe) when configured, online,
 * and recordable; falls back to the browser Web Speech API. Recordings are
 * capped at 60s. The transcript goes to `onTranscript`; the consumer decides
 * whether to append or auto-submit.
 */
export function useVoiceInput({ onTranscript }: UseVoiceInputOptions): VoiceInput {
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Gate `available` on mount so SSR and first client render match (the
  // feature-detect is client-only -> avoids hydration mismatch).
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const recogRef = useRef<SpeechRecognitionLike | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopTimerRef = useRef<number | null>(null);
  const startingRef = useRef(false);
  const mountedRef = useRef(true);
  const onTranscriptRef = useRef(onTranscript);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      recogRef.current?.abort();
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      if (stopTimerRef.current !== null) window.clearTimeout(stopTimerRef.current);
    };
  }, []);

  // --- Whisper path: record audio -> /api/transcribe ---
  async function startRecording() {
    if (startingRef.current) return;
    startingRef.current = true;
    setError(null);
    let acquiredStream: MediaStream | null = null;
    try {
      acquiredStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const stream = acquiredStream;
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const mime = pickAudioMime();
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (stopTimerRef.current !== null) {
          window.clearTimeout(stopTimerRef.current);
          stopTimerRef.current = null;
        }
        if (!mountedRef.current) return;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setListening(false);
        if (blob.size === 0) {
          setError('I could not transcribe that recording. Try again or type the task.');
          return;
        }
        setTranscribing(true);
        const text = await transcribeBlob(blob);
        if (!mountedRef.current) return;
        setTranscribing(false);
        if (text) onTranscriptRef.current(text);
        else setError('I could not transcribe that recording. Try again or type the task.');
      };
      recorderRef.current = recorder;
      recorder.start();
      acquiredStream = null;
      setListening(true);
      stopTimerRef.current = window.setTimeout(() => {
        if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      }, MAX_RECORD_MS);
    } catch {
      acquiredStream?.getTracks().forEach((track) => track.stop());
      if (mountedRef.current) {
        setListening(false);
        setError('Microphone access was not available.');
      }
    } finally {
      startingRef.current = false;
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }

  // --- Web Speech path (fallback / when Whisper isn't configured) ---
  function startWebSpeech() {
    if (!SpeechRecognitionAPI) {
      setListening(false);
      setError(
        whisperEnabled && canRecord && !navigator.onLine
          ? 'Voice transcription requires a network connection.'
          : 'Voice input is not supported in this browser.',
      );
      return;
    }
    setError(null);
    try {
      const recog = new SpeechRecognitionAPI();
      recog.lang = 'en-US';
      recog.continuous = false;
      recog.interimResults = false;
      recog.onresult = (event: SpeechRecognitionEventLike) => {
        if (!mountedRef.current) return;
        const transcript = event.results[0]?.[0]?.transcript ?? '';
        if (transcript.trim()) {
          setListening(false);
          onTranscriptRef.current(transcript.trim());
        }
      };
      recog.onerror = () => {
        if (!mountedRef.current) return;
        setListening(false);
        setError('Voice input stopped. Try again or type the task.');
      };
      recog.onend = () => {
        if (mountedRef.current) setListening(false);
      };
      recogRef.current = recog;
      recog.start();
      setListening(true);
    } catch {
      recogRef.current = null;
      setListening(false);
      setError('Voice input could not start. Check microphone access and try again.');
    }
  }

  const canRecord =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof MediaRecorder !== 'undefined';
  const micAvailable = whisperEnabled
    ? canRecord || !!SpeechRecognitionAPI
    : !!SpeechRecognitionAPI;

  function toggle() {
    if (listening) {
      if (recorderRef.current?.state === 'recording') stopRecording();
      else recogRef.current?.stop();
      setListening(false);
      return;
    }
    // Prefer Whisper when configured + online + recordable; else Web Speech.
    const useWhisper =
      whisperEnabled && canRecord && (typeof navigator === 'undefined' || navigator.onLine);
    if (useWhisper) void startRecording();
    else startWebSpeech();
  }

  return { available: mounted && micAvailable, listening, transcribing, error, toggle };
}
