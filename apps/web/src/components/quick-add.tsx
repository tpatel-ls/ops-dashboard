'use client';

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { FolderKanban, Loader2, Mic, MicOff, X } from 'lucide-react';
import { getDb } from '@ops-dashboard/core';
import type { Project } from '@ops-dashboard/core';
import { cn } from '@ops-dashboard/ui';
import { addTask, addTaskToProject } from '@/lib/tasks';
import { hapticSuccess, hapticTap } from '@/lib/haptics';
import { useVoiceInput } from '@/lib/use-voice-input';
import { useOrgStore } from '@/lib/org-store';
import { LAST_TASK_DESTINATION_KEY } from '@/lib/task-capture';
import {
  destinationOrgId,
  projectsForDestination,
  resolveWorkDestination,
  type WorkDestination,
} from '@/lib/work-logger';

const emptySubscribe = () => () => {};

export function QuickAdd() {
  const [value, setValue] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Optional project target: captures file straight into it (skips AI triage)
  // and inherit its domain + org lane. Cleared manually, not per capture, so
  // rapid multi-add into one project works.
  const [project, setProject] = useState<Project | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [projectFilter, setProjectFilter] = useState('');
  const [destinationOverride, setDestinationOverride] = useState<{
    ctx: string;
    value: WorkDestination;
  } | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const ctx = useOrgStore((state) => state.ctx);
  const storedDestination = useSyncExternalStore(
    emptySubscribe,
    () => window.localStorage.getItem(LAST_TASK_DESTINATION_KEY),
    () => null,
  );

  const data = useLiveQuery(async () => {
    const db = getDb();
    const [projects, organizations] = await Promise.all([
      db.projects.toArray(),
      db.organizations.toArray(),
    ]);
    return {
      projects: projects.filter((p) => !p.deletedAt && !p.archivedAt),
      organizations: organizations
        .filter((organization) => !organization.deletedAt && !organization.archivedAt)
        .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)),
    };
  });

  const defaultDestination = resolveWorkDestination(
    ctx,
    storedDestination,
    (data?.organizations ?? []).map((organization) => organization.id),
  );
  const destination =
    destinationOverride?.ctx === ctx ? destinationOverride.value : defaultDestination;
  const projects = projectsForDestination(data?.projects ?? [], destination);

  useEffect(() => {
    if (!pickerOpen) return;
    function onDown(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [pickerOpen]);

  function captureText(text: string) {
    hapticTap();
    setError(null);
    startTransition(async () => {
      try {
        if (project) await addTaskToProject(text, project);
        else {
          const orgId = destinationOrgId(destination);
          await addTask(text, orgId ? { orgId } : {});
        }
        hapticSuccess();
        setValue('');
      } catch {
        setError('Could not add task. Your text is still available.');
      }
    });
  }

  const {
    available: micAvailable,
    listening,
    transcribing,
    error: voiceError,
    toggle: toggleMic,
  } = useVoiceInput({
    onTranscript: (text) => {
      setValue(text);
      captureText(text);
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = value.trim();
    if (!text) return;
    captureText(text);
  }

  return (
    <form onSubmit={submit} className="flex min-w-0 flex-1 items-center gap-1.5 md:gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={
          project
            ? `Add a task to ${project.name}...`
            : 'Add a task. Try: ship spec tomorrow 3pm !!'
        }
        className="text-foreground placeholder:text-subtle-foreground min-w-0 flex-1 bg-transparent text-sm outline-none"
        aria-label="Quick add task"
        aria-invalid={Boolean(error || voiceError) || undefined}
        aria-errormessage={error || voiceError ? 'quick-add-error' : undefined}
        disabled={pending || listening || transcribing}
        autoComplete="off"
        spellCheck={false}
      />
      <span className="bg-card/70 text-subtle-foreground hidden shrink-0 rounded-full border px-2 py-1 font-mono text-[10px] tracking-[0.12em] uppercase xl:inline-flex">
        {project
          ? 'Project mode'
          : destination === 'personal'
            ? pending
              ? 'Adding'
              : 'Personal task'
            : 'Org task'}
      </span>
      {!project ? (
        <select
          value={destination}
          onChange={(event) => {
            const nextDestination = event.target.value;
            window.localStorage.setItem(LAST_TASK_DESTINATION_KEY, nextDestination);
            setDestinationOverride({ ctx, value: nextDestination });
            setProject(null);
          }}
          aria-label="Task organization"
          className="bg-card text-foreground hidden h-8 max-w-32 shrink-0 rounded-md border px-2 text-[11px] outline-none md:block"
        >
          {(data?.organizations ?? []).map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name}
            </option>
          ))}
          <option value="personal">Personal</option>
        </select>
      ) : null}
      <div ref={pickerRef} className="relative flex shrink-0 items-center">
        <button
          type="button"
          onClick={() => {
            setPickerOpen((v) => !v);
            setProjectFilter('');
          }}
          aria-haspopup="listbox"
          aria-expanded={pickerOpen}
          aria-label={project ? `Adding to ${project.name}` : 'Choose a project'}
          className={cn(
            'flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-md px-1.5 text-[11px] transition-colors md:h-8 md:min-h-8 md:min-w-8',
            project ? 'bg-accent text-foreground' : 'text-subtle-foreground hover:text-foreground',
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
                className="text-muted-foreground hover:text-foreground size-3 transition-colors"
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
          <div className="surface absolute top-full right-0 z-50 mt-3 w-72 overflow-hidden">
            <div className="hairline flex items-center justify-between border-b px-3 py-2">
              <span className="text-subtle-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                Choose project
              </span>
              <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 font-mono text-[9px] tracking-[0.1em] uppercase">
                {project ? 'locked' : 'auto'}
              </span>
            </div>
            <input
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              placeholder="Type to filter projects..."
              autoFocus
              className="hairline text-foreground placeholder:text-subtle-foreground w-full border-b bg-transparent px-3 py-2 text-xs outline-none"
            />
            <div className="scrollbar-thin max-h-56 overflow-y-auto py-1" role="listbox">
              <button
                type="button"
                onClick={() => {
                  setProject(null);
                  setPickerOpen(false);
                }}
                className="text-muted-foreground hover:bg-accent hover:text-foreground flex min-h-10 w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors"
              >
                <span aria-hidden className="bg-bg-sunken size-2 rounded-full" />
                <span>No project</span>
              </button>
              {projects
                .filter((p) => p.name.toLowerCase().includes(projectFilter.trim().toLowerCase()))
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setProject(p);
                      setPickerOpen(false);
                    }}
                    className="text-muted-foreground hover:bg-accent hover:text-foreground flex min-h-10 w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors"
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
            'flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-md p-1 transition-colors md:min-h-8 md:min-w-8',
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
      {error || voiceError ? (
        <span id="quick-add-error" role="alert" className="sr-only">
          {error ?? voiceError}
        </span>
      ) : null}
    </form>
  );
}
