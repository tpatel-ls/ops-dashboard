'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Loader2, Mic, MicOff } from 'lucide-react';
import { cn } from '@drift/ui';
import { runCapture } from '@/lib/capture-client';
import { pickAudioMime, transcribeBlob, whisperEnabled } from '@/lib/transcribe';

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
    ? (window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition
    : undefined;

const MAX_RECORD_MS = 60_000;

export function QuickAdd() {
  const [value, setValue] = useState('');
  const [pending, startTransition] = useTransition();
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  // Gate the mic button on mount so SSR and first client render match (the
  // feature-detect is client-only -> avoids hydration mismatch).
  const [mounted, setMounted] = useState(false);
  const recogRef = useRef<SpeechRecognitionLike | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      recogRef.current?.abort();
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      if (stopTimerRef.current !== null) window.clearTimeout(stopTimerRef.current);
    };
  }, []);

  function captureText(text: string, source: 'text' | 'voice') {
    startTransition(async () => {
      await runCapture(text, source);
      setValue('');
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = value.trim();
    if (!text) return;
    captureText(text, 'text');
  }

  // --- Whisper path: record audio -> /api/transcribe ---
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setListening(false);
        if (blob.size === 0) return;
        setTranscribing(true);
        const text = await transcribeBlob(blob);
        setTranscribing(false);
        if (text) {
          setValue(text);
          captureText(text, 'voice');
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setListening(true);
      stopTimerRef.current = window.setTimeout(() => {
        if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      }, MAX_RECORD_MS);
    } catch {
      setListening(false);
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }

  // --- Web Speech path (fallback / when Whisper isn't configured) ---
  function startWebSpeech() {
    if (!SpeechRecognitionAPI) return;
    const recog = new SpeechRecognitionAPI();
    recog.lang = 'en-US';
    recog.continuous = false;
    recog.interimResults = false;
    recog.onresult = (event: SpeechRecognitionEventLike) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      if (transcript.trim()) {
        setValue(transcript.trim());
        setListening(false);
        captureText(transcript.trim(), 'voice');
      }
    };
    recog.onerror = () => setListening(false);
    recog.onend = () => setListening(false);
    recogRef.current = recog;
    recog.start();
    setListening(true);
  }

  const canRecord =
    typeof navigator !== 'undefined' && !!navigator.mediaDevices && typeof MediaRecorder !== 'undefined';
  const micAvailable = whisperEnabled ? canRecord || !!SpeechRecognitionAPI : !!SpeechRecognitionAPI;

  function toggleMic() {
    if (listening) {
      if (recorderRef.current?.state === 'recording') stopRecording();
      else recogRef.current?.stop();
      setListening(false);
      return;
    }
    // Prefer Whisper when configured + online + recordable; else Web Speech.
    const useWhisper = whisperEnabled && canRecord && (typeof navigator === 'undefined' || navigator.onLine);
    if (useWhisper) void startRecording();
    else startWebSpeech();
  }

  return (
    <form onSubmit={submit} className="flex flex-1 items-center gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Capture anything. Try: ship spec tomorrow 3pm #work !!"
        className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-subtle-foreground"
        aria-label="Quick add task"
        disabled={pending || listening || transcribing}
        autoComplete="off"
        spellCheck={false}
      />
      {mounted && micAvailable ? (
        <button
          type="button"
          onClick={toggleMic}
          disabled={pending || transcribing}
          aria-label={
            transcribing ? 'Transcribing' : listening ? 'Stop recording' : 'Start voice capture'
          }
          className={cn(
            'flex shrink-0 items-center justify-center rounded-md p-1 transition-colors',
            listening
              ? 'text-destructive animate-pulse'
              : 'text-subtle-foreground hover:text-foreground',
          )}
        >
          {transcribing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : listening ? (
            <MicOff className="size-4" />
          ) : (
            <Mic className="size-4" />
          )}
        </button>
      ) : null}
    </form>
  );
}
