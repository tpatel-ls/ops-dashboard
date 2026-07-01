'use client';

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { FolderKanban, Loader2, Mic, MicOff, X } from 'lucide-react';
import { getDb } from '@ops-dashboard/core';
import type { Project } from '@ops-dashboard/core';
import { cn } from '@ops-dashboard/ui';
import { runCapture } from '@/lib/capture-client';
import { addTaskToProject } from '@/lib/tasks';
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

const emptySubscribe = () => () => {};

export function QuickAdd() {
  const [value, setValue] = useState('');
  const [pending, startTransition] = useTransition();
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  // Gate the mic button on mount so SSR and first client render match (the
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

  // Optional project target: captures file straight into it (skips AI triage)
  // and inherit its domain + org lane. Cleared manually, not per capture, so
  // rapid multi-add into one project works.
  const [project, setProject] = useState<Project | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [projectFilter, setProjectFilter] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  const projects = useLiveQuery(async () => {
    const all = await getDb().projects.toArray();
    return all
      .filter((p) => !p.deletedAt && !p.archivedAt)
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  useEffect(() => {
    if (!pickerOpen) return;
    function onDown(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [pickerOpen]);

  useEffect(() => {
    return () => {
      recogRef.current?.abort();
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      if (stopTimerRef.current !== null) window.clearTimeout(stopTimerRef.current);
    };
  }, []);

  function captureText(text: string, source: 'text' | 'voice') {
    startTransition(async () => {
      if (project) await addTaskToProject(text, project);
      else await runCapture(text, source);
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
        placeholder={
          project
            ? `Add a task to ${project.name}...`
            : 'Capture anything. Try: ship spec tomorrow 3pm #work !!'
        }
        className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-subtle-foreground"
        aria-label="Quick add task"
        disabled={pending || listening || transcribing}
        autoComplete="off"
        spellCheck={false}
      />
      <div ref={pickerRef} className="relative flex shrink-0 items-center">
        <button
          type="button"
          onClick={() => {
            setPickerOpen((v) => !v);
            setProjectFilter('');
          }}
          aria-haspopup="listbox"
          aria-expanded={pickerOpen}
          aria-label={project ? `Capturing into ${project.name}` : 'File into a project'}
          className={cn(
            'flex h-7 items-center gap-1.5 rounded-md px-1.5 text-[11px] transition-colors',
            project
              ? 'bg-accent text-foreground'
              : 'text-subtle-foreground hover:text-foreground',
          )}
        >
          {project ? (
            <>
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ background: project.color }}
              />
              <span className="hidden max-w-24 truncate md:inline">{project.name}</span>
              <X
                aria-hidden
                className="size-3 text-muted-foreground transition-colors hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  setProject(null);
                  setPickerOpen(false);
                }}
              />
            </>
          ) : (
            <FolderKanban className="size-4" aria-hidden />
          )}
        </button>
        {pickerOpen ? (
          <div className="surface absolute right-0 top-full z-50 mt-3 w-64 overflow-hidden">
            <input
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              placeholder="Type to filter projects..."
              autoFocus
              className="hairline w-full border-b bg-transparent px-3 py-2 text-xs text-foreground outline-none placeholder:text-subtle-foreground"
            />
            <div className="scrollbar-thin max-h-56 overflow-y-auto py-1" role="listbox">
              <button
                type="button"
                onClick={() => {
                  setProject(null);
                  setPickerOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <span aria-hidden className="size-2 rounded-full bg-bg-sunken" />
                <span>No project (AI triage)</span>
              </button>
              {(projects ?? [])
                .filter((p) =>
                  p.name.toLowerCase().includes(projectFilter.trim().toLowerCase()),
                )
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setProject(p);
                      setPickerOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <span
                      aria-hidden
                      className="size-2 rounded-full"
                      style={{ background: p.color }}
                    />
                    <span className="truncate">{p.name}</span>
                  </button>
                ))}
            </div>
          </div>
        ) : null}
      </div>
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
