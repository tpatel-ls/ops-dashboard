'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import {
  BookOpen,
  Calendar,
  CloudOff,
  FileText,
  Loader2,
  Mic,
  MicOff,
  NotebookPen,
  Quote,
  Repeat,
  RotateCcw,
  Sparkles,
  StickyNote,
  Users,
  Utensils,
} from 'lucide-react';
import type { CaptureKind } from '@ops-dashboard/core';
import { cn } from '@ops-dashboard/ui';
import { processBrainDump } from '@/lib/route-items';
import type { RoutedResult } from '@/lib/route-items';
import { useLocalDraft } from '@/lib/use-local-draft';
import { useVoiceInput } from '@/lib/use-voice-input';
import { ViewShell } from '@/components/view-shell';

const KIND_ICON: Record<CaptureKind, React.ElementType> = {
  task: FileText,
  note: StickyNote,
  journal: BookOpen,
  event: Calendar,
  person: Users,
  quote: Quote,
  routine: Repeat,
  food: Utensils,
  habit: Repeat,
};

type FeedEntry =
  | { type: 'notice'; id: string; text: string }
  | { type: 'item'; id: string; result: RoutedResult; undone: boolean };

function destinationLabel(r: RoutedResult): string {
  switch (r.recordType) {
    case 'foodLog':
      return r.detail ? `Food - ${r.detail}` : 'Food';
    case 'routineCheck':
      return r.detail ? `checked: ${r.detail}` : 'Routine checked';
    case 'journalEntry':
      return 'Journal';
    case 'note':
      return 'Note';
    case 'quote':
      return 'Quote';
    default:
      return r.detail ?? 'Task';
  }
}

export function Notepad() {
  const searchParams = useSearchParams();
  const { draft, setDraft, saveDraft } = useLocalDraft('ops:notepad-draft');
  const sharedValue = [
    searchParams.get('title'),
    searchParams.get('text'),
    searchParams.get('url'),
  ]
    .filter(Boolean)
    .join('\n');
  const [value, setValue] = useState(() => sharedValue || draft);
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [pending, startTransition] = useTransition();
  const taRef = useRef<HTMLTextAreaElement>(null);

  const { available, listening, transcribing, toggle } = useVoiceInput({
    // Append instead of auto-submitting: the user may keep talking/typing.
    onTranscript: (text) => setValue((v) => (v.trim() ? `${v.replace(/\s+$/, '')}\n${text}` : text)),
  });

  useEffect(() => {
    const id = window.setTimeout(() => saveDraft(value), 450);
    return () => window.clearTimeout(id);
  }, [saveDraft, value]);

  // Auto-grow the textarea with its content (capped so it never eats the page).
  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 480)}px`;
  }, [value]);

  function process() {
    const text = value.trim();
    if (!text || pending) return;
    startTransition(async () => {
      const results = await processBrainDump(text, 'notepad');
      if (results.length === 0) return;
      const entries: FeedEntry[] = results.map((r) => ({
        type: 'item',
        id: r.captureId,
        result: r,
        undone: false,
      }));
      if (results.some((r) => r.aiOffline)) {
        entries.unshift({
          type: 'notice',
          id: `notice-${results[0]!.captureId}`,
          text: 'AI offline - captured each line as a task',
        });
      }
      setFeed((prev) => [...entries, ...prev]);
      setValue('');
      setDraft('');
      saveDraft('');
    });
  }

  function undoEntry(id: string, result: RoutedResult) {
    startTransition(async () => {
      await result.undo();
      setFeed((prev) =>
        prev.map((e) => (e.type === 'item' && e.id === id ? { ...e, undone: true } : e)),
      );
    });
  }

  return (
    <ViewShell
      eyebrow="Capture"
      title="Work notes"
      subtitle="Capture tasks, decisions, and project updates in one pass."
      compactHeader
    >
      <div className="flex flex-col gap-5">
        <div className="command-surface flex flex-col gap-2 rounded-lg p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-[9px] bg-primary/10 text-primary">
                <NotebookPen className="size-4" aria-hidden />
              </span>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
                  Work intake
                </div>
                <div className="text-sm font-semibold">Capture once. Route the work.</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {['tasks', 'notes', 'decisions', 'updates'].map((label) => (
                <span
                  key={label}
                  className="rounded-md border bg-card/65 px-2 py-0.5 text-[9px] font-medium uppercase text-subtle-foreground"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
          <textarea
            ref={taRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                process();
              }
            }}
            rows={6}
            placeholder={
              'Add tasks, decisions, and project updates in any order.\n' +
              'follow up with the RingCentral owner tomorrow 2pm\n' +
              'decision: sequence blue text after no-answer calls\n' +
              'project update: dashboard visuals ready for review'
            }
            className="input min-h-36 resize-none !bg-transparent !border-0 !p-1 text-sm leading-6 focus:!shadow-none"
            disabled={pending || transcribing}
            spellCheck={false}
          />
          <div className="flex items-center gap-2">
            {available ? (
              <button
                type="button"
                onClick={toggle}
                disabled={pending || transcribing}
                aria-label={
                  transcribing ? 'Transcribing' : listening ? 'Stop recording' : 'Start dictating'
                }
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-md border border-border transition-colors',
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
            <span className="text-[11px] text-subtle-foreground">
              {listening
                ? 'Listening... speak freely, the transcript lands here.'
                : transcribing
                  ? 'Transcribing...'
                  : 'Every line or thought becomes its own item.'}
            </span>
            <div className="ml-auto flex items-center gap-2.5">
              <span className="hidden items-center gap-1 text-[11px] text-subtle-foreground sm:flex">
                <span className="kbd">Ctrl</span>
                <span className="kbd">Enter</span>
              </span>
              <button
                type="button"
                onClick={process}
                disabled={pending || transcribing || !value.trim()}
                className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {pending ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <Sparkles className="size-3.5" aria-hidden />
                )}
                Route items
              </button>
            </div>
          </div>
        </div>

        {feed.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between px-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
                This session
              </span>
              <Link
                href="/inbox"
                className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                Full trail in Inbox
              </Link>
            </div>
            <ul className="flex flex-col gap-2">
              {feed.map((entry) =>
                entry.type === 'notice' ? (
                  <li
                    key={entry.id}
                    className="flex items-center gap-2.5 rounded-lg border border-warning/40 bg-warning/10 px-4 py-2.5 text-xs text-warning"
                  >
                    <CloudOff className="size-4 shrink-0" aria-hidden />
                    <span>{entry.text}</span>
                  </li>
                ) : (
                  <FeedRow
                    key={entry.id}
                    entry={entry}
                    onUndo={() => undoEntry(entry.id, entry.result)}
                  />
                ),
              )}
            </ul>
          </div>
        )}
      </div>
    </ViewShell>
  );
}

function FeedRow({
  entry,
  onUndo,
}: {
  entry: Extract<FeedEntry, { type: 'item' }>;
  onUndo: () => void;
}) {
  const { result, undone } = entry;
  const Icon = KIND_ICON[result.kind] ?? FileText;
  return (
    <li
      className={cn(
        'surface-flat group flex items-center gap-3 px-4 py-2.5',
        undone && 'opacity-60',
      )}
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-bg-sunken text-subtle-foreground">
        <Icon className="size-4" aria-hidden />
      </span>
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-sm text-foreground',
          undone && 'line-through',
        )}
      >
        {result.title}
      </span>
      <span className="shrink-0 rounded-md bg-bg-sunken px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
        {undone ? 'undone' : destinationLabel(result)}
      </span>
      {!undone ? (
        <button
          type="button"
          onClick={onUndo}
          title="Undo"
          aria-label={`Undo ${result.title}`}
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-subtle-foreground opacity-0 transition-opacity hover:bg-bg-sunken hover:text-foreground group-hover:opacity-100"
        >
          <RotateCcw className="size-4" aria-hidden />
        </button>
      ) : null}
    </li>
  );
}

function EmptyState() {
  return (
    <div className="surface flex min-h-40 flex-col items-center justify-center gap-2 p-6 text-center">
      <span className="flex size-9 items-center justify-center rounded-lg bg-bg-sunken text-subtle-foreground">
        <NotebookPen className="size-4" aria-hidden />
      </span>
      <p className="text-sm font-semibold text-foreground">Ready for work intake</p>
      <div className="max-w-sm text-xs leading-5 text-muted-foreground">
        <p>Type or dictate a batch, then route each line.</p>
        <p className="mt-2 font-mono text-[11px] text-subtle-foreground">
          follow up with the integration owner tomorrow 2pm
          <br />
          decision: prioritize inbound transfer reliability
          <br />
          project update: scripting review complete
        </p>
      </div>
    </div>
  );
}
