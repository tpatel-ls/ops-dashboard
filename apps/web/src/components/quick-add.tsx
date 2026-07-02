'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { FolderKanban, Loader2, Mic, MicOff, X } from 'lucide-react';
import { getDb } from '@ops-dashboard/core';
import type { Project } from '@ops-dashboard/core';
import { cn } from '@ops-dashboard/ui';
import { runCapture } from '@/lib/capture-client';
import { addTaskToProject } from '@/lib/tasks';
import { useVoiceInput } from '@/lib/use-voice-input';

export function QuickAdd() {
  const [value, setValue] = useState('');
  const [pending, startTransition] = useTransition();

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

  function captureText(text: string, source: 'text' | 'voice') {
    startTransition(async () => {
      if (project) await addTaskToProject(text, project);
      else await runCapture(text, source);
      setValue('');
    });
  }

  const {
    available: micAvailable,
    listening,
    transcribing,
    toggle: toggleMic,
  } = useVoiceInput({
    onTranscript: (text) => {
      setValue(text);
      captureText(text, 'voice');
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = value.trim();
    if (!text) return;
    captureText(text, 'text');
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
      {micAvailable ? (
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
