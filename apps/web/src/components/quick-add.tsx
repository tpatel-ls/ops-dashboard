'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { FolderKanban, Loader2, Mic, MicOff, X } from 'lucide-react';
import { getDb } from '@ops-dashboard/core';
import type { Project } from '@ops-dashboard/core';
import { cn } from '@ops-dashboard/ui';
import { addTask, addTaskToProject } from '@/lib/tasks';
import { hapticSuccess, hapticTap } from '@/lib/haptics';
import { useVoiceInput } from '@/lib/use-voice-input';
import { useOrgStore } from '@/lib/org-store';
import {
  destinationOrgId,
  projectsForDestination,
  resolveWorkDestination,
  type WorkDestination,
} from '@/lib/work-logger';

export function QuickAdd() {
  const [value, setValue] = useState('');
  const [pending, startTransition] = useTransition();

  // Optional project target: captures file straight into it (skips AI triage)
  // and inherit its domain + org lane. Cleared manually, not per capture, so
  // rapid multi-add into one project works.
  const [project, setProject] = useState<Project | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [projectFilter, setProjectFilter] = useState('');
  const [destinationOverride, setDestinationOverride] = useState<WorkDestination | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const ctx = useOrgStore((state) => state.ctx);

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
    null,
    (data?.organizations ?? []).map((organization) => organization.id),
  );
  const destination = destinationOverride ?? defaultDestination;
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
    startTransition(async () => {
      if (project) await addTaskToProject(text, project);
      else {
        const orgId = destinationOrgId(destination);
        await addTask(text, orgId ? { orgId } : {});
      }
      hapticSuccess();
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
        className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-subtle-foreground"
        aria-label="Quick add task"
        disabled={pending || listening || transcribing}
        autoComplete="off"
        spellCheck={false}
      />
      <span className="hidden shrink-0 rounded-full border bg-card/70 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-subtle-foreground xl:inline-flex">
        {project
          ? 'Project mode'
          : destination === 'personal'
            ? pending ? 'Adding' : 'Personal task'
            : 'Org task'}
      </span>
      {!project ? (
        <select
          value={destination}
          onChange={(event) => {
            setDestinationOverride(event.target.value);
            setProject(null);
          }}
          aria-label="Task organization"
          className="hidden h-8 max-w-32 shrink-0 rounded-md border bg-card px-2 text-[11px] text-foreground outline-none md:block"
        >
          {(data?.organizations ?? []).map((organization) => (
            <option key={organization.id} value={organization.id}>{organization.name}</option>
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
          <div className="surface absolute right-0 top-full z-50 mt-3 w-72 overflow-hidden">
            <div className="hairline flex items-center justify-between border-b px-3 py-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-subtle-foreground">
                Choose project
              </span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-primary">
                {project ? 'locked' : 'auto'}
              </span>
            </div>
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
                className="flex min-h-10 w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <span aria-hidden className="size-2 rounded-full bg-bg-sunken" />
                <span>No project</span>
              </button>
              {projects
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
                    className="flex min-h-10 w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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
    </form>
  );
}
