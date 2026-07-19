'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { addDays, format } from 'date-fns';
import { Check, ChevronDown, Loader2, Plus, SlidersHorizontal } from 'lucide-react';
import { getDb } from '@ops-dashboard/core';
import type { Priority, Project } from '@ops-dashboard/core';
import { cn } from '@ops-dashboard/ui';
import { useOrgStore } from '@/lib/org-store';
import { useSyncStatus } from '@/lib/sync/status';
import { addTask } from '@/lib/tasks';
import {
  LAST_TASK_DESTINATION_KEY,
  LAST_TASK_PROJECT_KEY,
  resolveRecentProject,
  taskCaptureOverrides,
  taskScheduleLabel,
  type TaskSchedule,
} from '@/lib/task-capture';
import {
  destinationForProject,
  projectsForDestination,
  resolveWorkDestination,
  syncSaveMessage,
  type WorkDestination,
} from '@/lib/work-logger';
import { isActiveProject } from '@/lib/project-query';

const QUICK_SCHEDULES: Array<{ value: Exclude<TaskSchedule, 'date'>; label: string }> = [
  { value: 'inbox', label: 'Inbox' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
];

interface QuickTaskEntryProps {
  id?: string;
  defaultSchedule?: 'inbox' | 'today';
  project?: Project;
  compact?: boolean;
  autoFocus?: boolean;
}

function localDate(offsetDays = 0): string {
  return format(addDays(new Date(), offsetDays), 'yyyy-MM-dd');
}

export function QuickTaskEntry({
  id = 'quick-task-title',
  defaultSchedule = 'inbox',
  project: fixedProject,
  compact = false,
  autoFocus = false,
}: QuickTaskEntryProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const initializedContextRef = useRef<string | null>(null);
  const ctx = useOrgStore((state) => state.ctx);
  const syncState = useSyncStatus((state) => state.state);
  const syncPending = useSyncStatus((state) => state.pending);
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState<WorkDestination>('personal');
  const [projectId, setProjectId] = useState(fixedProject?.id ?? '');
  const [schedule, setSchedule] = useState<TaskSchedule>(defaultSchedule);
  const [scheduledDate, setScheduledDate] = useState(localDate());
  const [priority, setPriority] = useState<Priority>(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const data = useLiveQuery(async () => {
    const db = getDb();
    const [organizations, projects] = await Promise.all([
      db.organizations.toArray(),
      db.projects.toArray(),
    ]);
    return {
      organizations: organizations
        .filter((organization) => !organization.deletedAt && !organization.archivedAt)
        .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)),
      projects: projects.filter(isActiveProject),
    };
  });

  useEffect(() => {
    if (!data) return;
    const contextKey = fixedProject ? `project:${fixedProject.id}` : ctx;
    if (initializedContextRef.current === contextKey) return;

    const storedDestination = window.localStorage.getItem(LAST_TASK_DESTINATION_KEY);
    const nextDestination = fixedProject
      ? destinationForProject(fixedProject)
      : resolveWorkDestination(
          ctx,
          storedDestination,
          data.organizations.map((organization) => organization.id),
        );
    const recentProject = fixedProject ?? resolveRecentProject(
      data.projects,
      nextDestination,
      window.localStorage.getItem(LAST_TASK_PROJECT_KEY),
    );

    setDestination(nextDestination);
    setProjectId(recentProject?.id ?? '');
    initializedContextRef.current = contextKey;
  }, [ctx, data, fixedProject]);

  const availableProjects = useMemo(
    () => projectsForDestination(data?.projects ?? [], destination).filter(isActiveProject),
    [data?.projects, destination],
  );
  const selectedProject = fixedProject ?? availableProjects.find((project) => project.id === projectId);
  const selectedOrganization = data?.organizations.find((organization) => organization.id === destination);
  const destinationLabel = selectedProject?.name ?? selectedOrganization?.name ?? 'Personal';

  function chooseDestination(nextDestination: WorkDestination) {
    setDestination(nextDestination);
    const recentProject = resolveRecentProject(
      data?.projects ?? [],
      nextDestination,
      window.localStorage.getItem(LAST_TASK_PROJECT_KEY),
    );
    setProjectId(recentProject?.id ?? '');
    setError(null);
  }

  function scheduledFor(): string | undefined {
    if (schedule === 'today') return localDate();
    if (schedule === 'tomorrow') return localDate(1);
    if (schedule === 'date') return scheduledDate || undefined;
    return undefined;
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const input = title.trim();
    if (!input) {
      setError('Enter a task before saving.');
      inputRef.current?.focus();
      return;
    }
    if (saving) return;

    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      await addTask(
        input,
        taskCaptureOverrides(destination, selectedProject, scheduledFor(), priority),
      );
      window.localStorage.setItem(LAST_TASK_DESTINATION_KEY, destination);
      if (selectedProject) {
        window.localStorage.setItem(LAST_TASK_PROJECT_KEY, selectedProject.id);
      } else {
        window.localStorage.removeItem(LAST_TASK_PROJECT_KEY);
      }
      setTitle('');
      setStatus(`Added to ${destinationLabel}. ${syncSaveMessage(syncState, syncPending + 1)}`);
      window.requestAnimationFrame(() => inputRef.current?.focus());
    } catch {
      setError('Could not add this task. Your text is still here.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={cn('surface overflow-hidden', compact ? 'p-2.5 sm:p-3' : 'p-4 sm:p-5')}>
      <form aria-label="Quick task entry" onSubmit={save} className={cn('flex flex-col', compact ? 'gap-2' : 'gap-3')}>
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn('hidden size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:flex', compact && 'sm:hidden')}
            aria-hidden
          >
            <Plus className="size-4" />
          </span>
          <label htmlFor={id} className="sr-only">Task title</label>
          <input
            ref={inputRef}
            id={id}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setError(null);
              setStatus(null);
            }}
            placeholder="Add a task and press Enter"
            aria-invalid={Boolean(error) || undefined}
            aria-errormessage={error ? `${id}-error` : undefined}
            className={cn('input min-w-0 flex-1', compact ? 'min-h-11 text-sm' : 'min-h-12 text-base')}
            autoComplete="off"
            autoFocus={autoFocus}
          />
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className={cn('inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50', compact ? 'min-h-11 px-3' : 'min-h-12 px-4')}
          >
            {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
            <span className="hidden sm:inline">Add task</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        {!fixedProject ? (
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <div
              role="group"
              aria-label="Schedule task"
              className="grid w-full grid-cols-3 gap-1 rounded-lg border bg-bg-sunken p-1 sm:w-auto"
            >
              {QUICK_SCHEDULES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={schedule === option.value}
                  onClick={() => setSchedule(option.value)}
                  className={cn(
                    'rounded-md px-3 text-xs font-medium transition-colors',
                    compact ? 'min-h-9 sm:min-h-8' : 'min-h-10 sm:min-h-8',
                    schedule === option.value
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="flex min-w-0 items-center gap-2 sm:ml-auto">
              <button
                type="button"
                aria-expanded={detailsOpen}
                aria-controls={`${id}-details`}
                onClick={() => setDetailsOpen((open) => !open)}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground sm:min-h-8"
              >
                <SlidersHorizontal className="size-3.5" aria-hidden />
                Details
                <ChevronDown className={cn('size-3.5 transition-transform', detailsOpen && 'rotate-180')} aria-hidden />
              </button>
              <span className="min-w-0 flex-1 truncate text-xs text-subtle-foreground sm:max-w-64">
                {destinationLabel} / {taskScheduleLabel(schedule, scheduledDate)}
                {priority >= 2 ? ` / ${priority === 3 ? 'Critical' : 'Important'}` : ''}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-subtle-foreground">New task in {fixedProject.name}</p>
        )}

        {detailsOpen && !fixedProject ? (
          <div id={`${id}-details`} className="grid gap-3 border-t pt-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Organization
              <select
                value={destination}
                onChange={(event) => chooseDestination(event.target.value)}
                className="input min-h-11"
              >
                {(data?.organizations ?? []).map((organization) => (
                  <option key={organization.id} value={organization.id}>{organization.name}</option>
                ))}
                <option value="personal">Personal</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Project
              <select
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                className="input min-h-11"
              >
                <option value="">No project</option>
                {availableProjects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Schedule
              <select
                value={schedule}
                onChange={(event) => setSchedule(event.target.value as TaskSchedule)}
                className="input min-h-11"
              >
                <option value="inbox">Inbox</option>
                <option value="today">Today</option>
                <option value="tomorrow">Tomorrow</option>
                <option value="date">Pick date</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-medium">
              Priority
              <select
                value={priority}
                onChange={(event) => setPriority(Number(event.target.value) as Priority)}
                className="input min-h-11"
              >
                <option value={0}>Normal</option>
                <option value={2}>Important</option>
                <option value={3}>Critical</option>
              </select>
            </label>
            {schedule === 'date' ? (
              <label className="flex flex-col gap-1.5 text-xs font-medium sm:col-span-2 lg:col-span-1">
                Date
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(event) => setScheduledDate(event.target.value)}
                  className="input min-h-11"
                />
              </label>
            ) : null}
          </div>
        ) : null}
      </form>

      <div className={cn('text-xs', compact ? 'pt-1' : 'min-h-5 pt-2')}>
        {error ? <p id={`${id}-error`} role="alert" className="text-destructive">{error}</p> : null}
        {status ? (
          <p role="status" aria-live="polite" className="flex items-center gap-1.5 text-success">
            <Check className="size-3.5" aria-hidden />
            {status}
          </p>
        ) : null}
      </div>
    </section>
  );
}
