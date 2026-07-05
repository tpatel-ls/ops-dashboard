'use client';

import Link from 'next/link';
import { Loader2, Mic, MicOff, NotebookPen, Sparkles, X } from 'lucide-react';
import { useState, useTransition } from 'react';
import { cn } from '@ops-dashboard/ui';
import { useAppStore } from '@/lib/app-store';
import { processBrainDump } from '@/lib/route-items';
import { useVoiceInput } from '@/lib/use-voice-input';

/** How long the "N items filed" summary flashes before the dialog closes. */
const SUMMARY_MS = 900;

export function QuickAddDialog() {
  const open = useAppStore((s) => s.quickAddOpen);
  const close = useAppStore((s) => s.closeQuickAdd);
  const [value, setValue] = useState('');
  const [summary, setSummary] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const { available, listening, transcribing, toggle } = useVoiceInput({
    // Append so the user can keep talking/typing before submitting.
    onTranscript: (text) => setValue((v) => (v.trim() ? `${v.trim()} ${text}` : text)),
  });

  if (!open) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = value.trim();
    if (!text || pending) return;
    startTransition(async () => {
      const results = await processBrainDump(text, 'text');
      setValue('');
      const offline = results.some((r) => r.aiOffline);
      setSummary(
        `${results.length} ${results.length === 1 ? 'item' : 'items'} filed${
          offline ? ' (AI offline, as tasks)' : ''
        }`,
      );
      window.setTimeout(() => {
        setSummary(null);
        close();
      }, SUMMARY_MS);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-[18vh] backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="surface w-full max-w-2xl overflow-hidden">
        <div className="hairline flex items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
              Command capture
            </div>
            <div className="text-sm font-semibold tracking-tight">Route anything into the system</div>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close capture"
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <form onSubmit={submit} className="flex items-center gap-3 px-4 py-3">
          {pending ? (
            <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
          ) : (
            <Sparkles className="size-4 text-primary" aria-hidden />
          )}
          {summary ? (
            <span className="flex-1 text-sm text-muted-foreground">{summary}</span>
          ) : (
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={pending || listening || transcribing}
              placeholder="Capture anything: a task, a meal, a thought..."
              className="flex-1 bg-transparent text-base outline-none placeholder:text-subtle-foreground"
            />
          )}
          {available && !summary ? (
            <button
              type="button"
              onClick={toggle}
              disabled={pending || transcribing}
              aria-label={
                transcribing ? 'Transcribing' : listening ? 'Stop recording' : 'Start dictating'
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
          <span className="kbd">Enter</span>
        </form>
        <div className="hairline flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {['task', 'meal', 'thought'].map((label) => (
              <span
                key={label}
                className="rounded-full border bg-bg-sunken px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-subtle-foreground"
              >
                {label}
              </span>
            ))}
          </div>
          <span className="text-[11px] text-subtle-foreground">
            Multiple thoughts? Brain-dump in the Notepad.
          </span>
          <Link
            href="/notepad"
            onClick={close}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <NotebookPen className="size-3.5" aria-hidden />
            Open Notepad
          </Link>
        </div>
      </div>
    </div>
  );
}
