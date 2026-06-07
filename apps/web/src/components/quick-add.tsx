'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '@drift/ui';
import { runCapture } from '@/lib/capture-client';

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

export function QuickAdd() {
  const [value, setValue] = useState('');
  const [pending, startTransition] = useTransition();
  const [listening, setListening] = useState(false);
  const recogRef = useRef<SpeechRecognitionLike | null>(null);

  // Clean up recognition on unmount
  useEffect(() => {
    return () => {
      recogRef.current?.abort();
    };
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = value.trim();
    if (!text) return;
    startTransition(async () => {
      await runCapture(text, 'text');
      setValue('');
    });
  }

  function toggleMic() {
    if (!SpeechRecognitionAPI) return;

    if (listening) {
      recogRef.current?.stop();
      setListening(false);
      return;
    }

    const recog = new SpeechRecognitionAPI();
    recog.lang = 'en-US';
    recog.continuous = false;
    recog.interimResults = false;

    recog.onresult = (event: SpeechRecognitionEventLike) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      if (transcript.trim()) {
        setValue(transcript.trim());
        setListening(false);
        // Auto-submit after voice fill
        startTransition(async () => {
          await runCapture(transcript.trim(), 'voice');
          setValue('');
        });
      }
    };

    recog.onerror = () => setListening(false);
    recog.onend = () => setListening(false);

    recogRef.current = recog;
    recog.start();
    setListening(true);
  }

  return (
    <form onSubmit={submit} className="flex flex-1 items-center gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Capture anything. Try: ship spec tomorrow 3pm #work !!"
        className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-subtle-foreground"
        aria-label="Quick add task"
        disabled={pending || listening}
        autoComplete="off"
        spellCheck={false}
      />
      {SpeechRecognitionAPI ? (
        <button
          type="button"
          onClick={toggleMic}
          disabled={pending}
          aria-label={listening ? 'Stop recording' : 'Start voice capture'}
          className={cn(
            'flex shrink-0 items-center justify-center rounded-md p-1 transition-colors',
            listening
              ? 'text-destructive animate-pulse'
              : 'text-subtle-foreground hover:text-foreground',
          )}
        >
          {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
        </button>
      ) : null}
    </form>
  );
}
