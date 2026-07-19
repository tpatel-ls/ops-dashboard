'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { addDays, format } from 'date-fns';
import { Check, ChevronDown, FolderKanban, Loader2, Plus, SlidersHorizontal, Timer, X } from 'lucide-react';
import { getDb, PERSONAL_COLOR } from '@ops-dashboard/core';
import type { Organization, Priority, Project, ProjectKind } from '@ops-dashboard/core';
import { cn } from '@ops-dashboard/ui';
import { useAppStore, type WorkLoggerMode } from '@/lib/app-store';
import { useOrgStore } from '@/lib/org-store';
import { useSyncStatus } from '@/lib/sync/status';
import { addTask } from '@/lib/tasks';
import { createProject } from '@/lib/projects';
import { createOrganization, nextOrgColor } from '@/lib/organizations';
import { logWork } from '@/lib/worklogs';
import {
  LAST_TASK_DESTINATION_KEY,
  LAST_TASK_PROJECT_KEY,
  resolveRecentProject,
  taskScheduleLabel,
  type TaskSchedule,
} from '@/lib/task-capture';
import {
  destinationOrgId,
  destinationForProject,
  projectsForDestination,
  resolveWorkDestination,
  syncSaveMessage,
  validWorkMinutes,
  type WorkDestination,
} from '@/lib/work-logger';

const MODE_META: Array<{
  id: WorkLoggerMode;
  label: string;
  icon: typeof Check;
}> = [
  { id: 'task', label: 'Task', icon: Check },
  { id: 'project', label: 'Project', icon: FolderKanban },
  { id: 'progress', label: 'Progress', icon: Timer },
];

function readLastDestination(): WorkDestination | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(LAST_TASK_DESTINATION_KEY);
}

function readLastProjectId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(LAST_TASK_PROJECT_KEY);
}

function rememberDestination(destination: WorkDestination): void {
  window.localStorage.setItem(LAST_TASK_DESTINATION_KEY, destination);
}

function localDate(offsetDays = 0): string {
  return format(addDays(new Date(), offsetDays), 'yyyy-MM-dd');
}

function destinationName(destination: WorkDestination, orgs: Organization[]): string {
  if (destination === 'personal') return 'Personal';
  return orgs.find((org) => org.id === destination)?.name ?? 'Personal';
}

export function WorkLoggerDialog() {
  const open = useAppStore((state) => state.workLoggerOpen);
  const launchMode = useAppStore((state) => state.workLoggerMode);
  const launchProjectId = useAppStore((state) => state.workLoggerProjectId);
  const close = useAppStore((state) => state.closeWorkLogger);
  const ctx = useOrgStore((state) => state.ctx);

  const data = useLiveQuery(async () => {
    const db = getDb();
    const [organizations, projects] = await Promise.all([
      db.organizations.toArray(),
      db.projects.toArray(),
    ]);
    return {
      organizations: organizations
        .filter((org) => !org.deletedAt && !org.archivedAt)
        .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)),
      projects: projects.filter(
        (project) =>
          !project.deletedAt &&
          !project.archivedAt &&
          project.status !== 'done' &&
          project.status !== 'archived',
      ),
    };
  });

  if (!open) return null;

  if (!data) {
    return (
      <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 sm:items-center sm:p-4">
        <div
          className="surface work-logger-panel flex h-40 w-full items-center justify-center"
          style={{ maxWidth: 680 }}
        >
          <Loader2 className="size-5 animate-spin text-primary" aria-label="Loading logger" />
        </div>
      </div>
    );
  }

  const launchProject = launchProjectId
    ? data.projects.find((project) => project.id === launchProjectId)
    : undefined;
  const initialDestination = launchProject
    ? destinationForProject(launchProject)
    : resolveWorkDestination(
        ctx,
        readLastDestination(),
        data.organizations.map((org) => org.id),
      );
  const initialProject = launchProject ?? resolveRecentProject(
    data.projects,
    initialDestination,
    readLastProjectId(),
  );

  return (
    <WorkLoggerPanel
      key={`${launchMode}:${initialProject?.id ?? 'none'}`}
      launchMode={launchMode}
      launchProjectId={initialProject?.id ?? null}
      initialDestination={initialDestination}
      organizations={data.organizations}
      projects={data.projects}
      onClose={close}
    />
  );
}

function WorkLoggerPanel({
  launchMode,
  launchProjectId,
  initialDestination,
  organizations,
  projects,
  onClose,
}: {
  launchMode: WorkLoggerMode;
  launchProjectId: string | null;
  initialDestination: WorkDestination;
  organizations: Organization[];
  projects: Project[];
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [mode, setMode] = useState<WorkLoggerMode>(launchMode);
  const [destination, setDestination] = useState<WorkDestination>(initialDestination);
  const [projectId, setProjectId] = useState(launchProjectId ?? '');
  const [taskTitle, setTaskTitle] = useState('');
  const [schedule, setSchedule] = useState<TaskSchedule>('inbox');
  const [scheduledDate, setScheduledDate] = useState(localDate());
  const [priority, setPriority] = useState<Priority>(0);
  const [taskDetailsOpen, setTaskDetailsOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectKind, setProjectKind] = useState<ProjectKind>('project');
  const [projectDueDate, setProjectDueDate] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [minutes, setMinutes] = useState(30);
  const [progressNote, setProgressNote] = useState('');
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const syncState = useSyncStatus((state) => state.state);
  const syncPending = useSyncStatus((state) => state.pending);

  const filteredProjects = useMemo(
    () => projectsForDestination(projects, destination),
    [projects, destination],
  );
  const selectedProject = filteredProjects.find((project) => project.id === projectId);
  const selectedDestinationName = destinationName(destination, organizations);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const initialFocus = panel.querySelector<HTMLElement>('[data-autofocus]');
    initialFocus?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        panelRef.current?.querySelector<HTMLFormElement>('#work-logger-form')?.requestSubmit();
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(
        panel!.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
      previousFocusRef.current?.focus();
    };
  }, [onClose]);

  function chooseDestination(next: WorkDestination) {
    setDestination(next);
    setProjectId('');
    setError(null);
    rememberDestination(next);
  }

  async function addOrganization() {
    const name = newOrgName.trim();
    if (!name) return;
    setSaving(true);
    setError(null);
    try {
      const organization = await createOrganization({
        name,
        color: nextOrgColor(organizations.length),
      });
      chooseDestination(organization.id);
      setNewOrgName('');
      setCreatingOrg(false);
    } catch {
      setError('Could not create the organization. Your other entries are unchanged.');
    } finally {
      setSaving(false);
    }
  }

  function scheduledFor(): string | undefined {
    if (schedule === 'today') return localDate();
    if (schedule === 'tomorrow') return localDate(1);
    if (schedule === 'date') return scheduledDate || undefined;
    return undefined;
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving || savedMessage) return;
    setError(null);

    if (mode === 'task' && !taskTitle.trim()) {
      setError('Enter a task before saving.');
      return;
    }
    if (mode === 'project' && !projectName.trim()) {
      setError('Enter a project name before saving.');
      return;
    }
    if (mode === 'progress' && !selectedProject) {
      setError('Choose a project before logging progress.');
      return;
    }
    if (mode === 'progress' && !validWorkMinutes(minutes)) {
      setError('Enter whole minutes between 1 and 1440.');
      return;
    }

    setSaving(true);
    try {
      const orgId = destinationOrgId(destination);
      if (mode === 'task') {
        await addTask(taskTitle.trim(), {
          priority,
          ...(scheduledFor() ? { scheduledFor: scheduledFor() } : {}),
          ...(selectedProject
            ? {
                projectId: selectedProject.id,
                ...(selectedProject.domainId ? { domainId: selectedProject.domainId } : {}),
                ...(selectedProject.orgId ? { orgId: selectedProject.orgId } : {}),
              }
            : orgId
              ? { orgId }
              : {}),
        });
        rememberDestination(destination);
        if (selectedProject) {
          window.localStorage.setItem(LAST_TASK_PROJECT_KEY, selectedProject.id);
        } else {
          window.localStorage.removeItem(LAST_TASK_PROJECT_KEY);
        }
      } else if (mode === 'project') {
        await createProject(projectName.trim(), {
          kind: projectKind,
          ...(orgId ? { orgId } : {}),
          ...(projectDueDate ? { dueDate: projectDueDate } : {}),
          ...(projectDescription.trim() ? { description: projectDescription.trim() } : {}),
        });
      } else if (selectedProject) {
        await logWork(selectedProject.id, minutes, progressNote.trim() || undefined);
      }

      const message = syncSaveMessage(syncState, syncPending + 1);
      setSavedMessage(message);
      closeTimerRef.current = window.setTimeout(onClose, 950);
    } catch {
      setError(`Could not save this ${mode}. Your entry is still here.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="work-logger-title"
        className="surface work-logger-panel flex max-h-[calc(100dvh-0.25rem)] w-full flex-col overflow-hidden sm:max-h-[calc(100dvh-2rem)]"
        style={{ maxWidth: 680 }}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border-strong sm:hidden" aria-hidden />
        <header className="hairline flex items-center justify-between gap-3 border-b px-4 pb-3 pt-2 sm:px-5 sm:pt-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase text-primary">
              {selectedDestinationName}
            </p>
            <h2 id="work-logger-title" className="truncate text-base font-semibold">
              {mode === 'task' ? 'Add a task' : mode === 'project' ? 'Create a project' : 'Log progress'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close logger"
            title="Close"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:size-9"
          >
            <X className="size-4" aria-hidden />
          </button>
        </header>

        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          <div className="grid grid-cols-3 gap-1 rounded-lg border bg-bg-sunken p-1">
            {MODE_META.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={mode === id}
                onClick={() => {
                  setMode(id);
                  setTaskDetailsOpen(false);
                  setError(null);
                }}
                className={cn(
                  'flex min-h-11 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition-colors',
                  mode === id
                    ? 'bg-card text-foreground shadow-sm ring-1 ring-primary/20'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className={cn('size-3.5', mode === id && 'text-primary')} aria-hidden />
                {label}
              </button>
            ))}
          </div>

          {mode === 'task' ? (
            <TaskTitleField
              title={taskTitle}
              onTitleChange={setTaskTitle}
              invalid={Boolean(error)}
            />
          ) : null}

          {mode === 'task' ? (
            <button
              type="button"
              aria-expanded={taskDetailsOpen}
              aria-controls="work-task-details"
              onClick={() => setTaskDetailsOpen((open) => !open)}
              className="mt-3 flex min-h-11 w-full items-center gap-2 rounded-lg border bg-bg-sunken px-3 text-left text-xs text-muted-foreground hover:text-foreground"
            >
              <SlidersHorizontal className="size-3.5 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1 truncate">
                {selectedProject?.name ?? selectedDestinationName} / {taskScheduleLabel(schedule, scheduledDate)}
                {priority >= 2 ? ` / ${priority === 3 ? 'Critical' : 'Important'}` : ''}
              </span>
              <ChevronDown className={cn('size-3.5 shrink-0 transition-transform', taskDetailsOpen && 'rotate-180')} aria-hidden />
            </button>
          ) : null}

          {mode !== 'task' || taskDetailsOpen ? (
          <section id={mode === 'task' ? 'work-task-details' : undefined} className="mt-5" aria-labelledby="work-destination-label">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p
                  id="work-destination-label"
                  className="text-xs font-medium text-foreground"
                >
                  Organization
                </p>
                <p className="text-[11px] text-subtle-foreground">
                  Selected: {selectedDestinationName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreatingOrg((value) => !value)}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground sm:min-h-8"
              >
                <Plus className="size-3.5" aria-hidden />
                Add org
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {organizations.map((org) => (
                <DestinationButton
                  key={org.id}
                  label={org.name}
                  color={org.color}
                  active={destination === org.id}
                  onClick={() => chooseDestination(org.id)}
                />
              ))}
              <DestinationButton
                label="Personal"
                color={PERSONAL_COLOR}
                active={destination === 'personal'}
                onClick={() => chooseDestination('personal')}
              />
            </div>

            {creatingOrg ? (
              <div className="mt-2 flex flex-col gap-2 rounded-lg border bg-bg-sunken p-3 sm:flex-row">
                <label className="sr-only" htmlFor="new-org-name">Organization name</label>
                <input
                  id="new-org-name"
                  value={newOrgName}
                  onChange={(event) => setNewOrgName(event.target.value)}
                  placeholder="Organization name"
                  aria-invalid={Boolean(error) || undefined}
                  aria-errormessage={error ? 'work-logger-error' : undefined}
                  className="input min-h-11 flex-1"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void addOrganization();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => void addOrganization()}
                  disabled={saving || !newOrgName.trim()}
                  className="min-h-11 rounded-md bg-foreground px-4 text-xs font-medium text-background disabled:opacity-50"
                >
                  Create org
                </button>
              </div>
            ) : null}
          </section>
          ) : null}

          <form id="work-logger-form" onSubmit={save} className="mt-5 flex flex-col gap-4">
            {mode === 'task' && taskDetailsOpen ? (
              <TaskDetailsFields
                projectId={projectId}
                onProjectChange={setProjectId}
                projects={filteredProjects}
                schedule={schedule}
                onScheduleChange={setSchedule}
                scheduledDate={scheduledDate}
                onScheduledDateChange={setScheduledDate}
                priority={priority}
                onPriorityChange={setPriority}
              />
            ) : null}
            {mode === 'project' ? (
              <ProjectFields
                name={projectName}
                onNameChange={setProjectName}
                kind={projectKind}
                onKindChange={setProjectKind}
                dueDate={projectDueDate}
                onDueDateChange={setProjectDueDate}
                description={projectDescription}
                onDescriptionChange={setProjectDescription}
                invalid={Boolean(error)}
              />
            ) : null}
            {mode === 'progress' ? (
              <ProgressFields
                projectId={projectId}
                onProjectChange={setProjectId}
                projects={filteredProjects}
                minutes={minutes}
                onMinutesChange={setMinutes}
                note={progressNote}
                onNoteChange={setProgressNote}
                invalid={Boolean(error)}
              />
            ) : null}
          </form>
        </div>

        <footer className="hairline border-t bg-card/92 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:px-5 sm:pb-3">
          {error ? (
            <p id="work-logger-error" role="alert" className="mb-2 text-xs text-destructive">
              {error}
            </p>
          ) : null}
          {savedMessage ? (
            <div
              role="status"
              aria-live="polite"
              className="flex min-h-11 items-center justify-center gap-2 text-sm font-medium text-success"
            >
              <Check className="size-4" aria-hidden />
              {savedMessage}
            </div>
          ) : (
            <button
              type="submit"
              form="work-logger-form"
              disabled={saving}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {mode === 'task'
                ? 'Add task'
                : mode === 'project'
                  ? 'Create project'
                  : 'Log progress'}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

function DestinationButton({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex min-h-11 min-w-0 items-center gap-2 rounded-lg border px-3 text-left text-xs font-medium transition-colors sm:max-w-48',
        active
          ? 'border-primary/55 bg-primary/10 text-foreground'
          : 'bg-card text-muted-foreground hover:border-border-strong hover:text-foreground',
      )}
    >
      <span
        className="size-2.5 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.18)]"
        style={{ background: color }}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {active ? <Check className="size-3.5 shrink-0 text-primary" aria-hidden /> : null}
    </button>
  );
}

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-medium text-foreground">
      {children}
    </label>
  );
}

function TaskTitleField({
  title,
  onTitleChange,
  invalid,
}: {
  title: string;
  onTitleChange: (value: string) => void;
  invalid: boolean;
}) {
  return (
    <div className="mt-5 flex flex-col gap-1.5">
      <FieldLabel htmlFor="work-task-title">Task</FieldLabel>
      <input
        id="work-task-title"
        form="work-logger-form"
        data-autofocus
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        placeholder="What needs to happen?"
        aria-invalid={invalid || undefined}
        aria-errormessage={invalid ? 'work-logger-error' : undefined}
        className="input min-h-12 text-base"
        autoComplete="off"
      />
    </div>
  );
}

function TaskDetailsFields({
  projectId,
  onProjectChange,
  projects,
  schedule,
  onScheduleChange,
  scheduledDate,
  onScheduledDateChange,
  priority,
  onPriorityChange,
}: {
  projectId: string;
  onProjectChange: (value: string) => void;
  projects: Project[];
  schedule: TaskSchedule;
  onScheduleChange: (value: TaskSchedule) => void;
  scheduledDate: string;
  onScheduledDateChange: (value: string) => void;
  priority: Priority;
  onPriorityChange: (value: Priority) => void;
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="work-task-project">Project</FieldLabel>
          <select
            id="work-task-project"
            value={projectId}
            onChange={(event) => onProjectChange(event.target.value)}
            className="input min-h-11"
          >
            <option value="">No project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="work-task-date">Schedule</FieldLabel>
          <select
            id="work-task-date"
            value={schedule}
            onChange={(event) => onScheduleChange(event.target.value as typeof schedule)}
            className="input min-h-11"
          >
            <option value="inbox">Inbox</option>
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="date">Pick date</option>
          </select>
        </div>
      </div>
      {schedule === 'date' ? (
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="work-task-custom-date">Date</FieldLabel>
          <input
            id="work-task-custom-date"
            type="date"
            value={scheduledDate}
            onChange={(event) => onScheduledDateChange(event.target.value)}
            className="input min-h-11"
          />
        </div>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-foreground">Priority</span>
        <div className="grid grid-cols-3 gap-2">
          {([
            [0, 'Normal'],
            [2, 'Important'],
            [3, 'Critical'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={priority === value}
              onClick={() => onPriorityChange(value)}
              className={cn(
                'min-h-11 rounded-md border px-2 text-xs transition-colors',
                priority === value
                  ? 'border-primary/55 bg-primary/10 text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function ProjectFields({
  name,
  onNameChange,
  kind,
  onKindChange,
  dueDate,
  onDueDateChange,
  description,
  onDescriptionChange,
  invalid,
}: {
  name: string;
  onNameChange: (value: string) => void;
  kind: ProjectKind;
  onKindChange: (value: ProjectKind) => void;
  dueDate: string;
  onDueDateChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  invalid: boolean;
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="work-project-name">Project name</FieldLabel>
        <input
          id="work-project-name"
          data-autofocus
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Name the outcome"
          aria-invalid={invalid || undefined}
          aria-errormessage={invalid ? 'work-logger-error' : undefined}
          className="input min-h-12 text-base"
          autoComplete="off"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="work-project-kind">Type</FieldLabel>
          <select
            id="work-project-kind"
            value={kind}
            onChange={(event) => onKindChange(event.target.value as ProjectKind)}
            className="input min-h-11"
          >
            <option value="project">Project</option>
            <option value="area">Area</option>
            <option value="retainer">Retainer</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor="work-project-due">Due date</FieldLabel>
          <input
            id="work-project-due"
            type="date"
            value={dueDate}
            onChange={(event) => onDueDateChange(event.target.value)}
            className="input min-h-11"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="work-project-description">Description</FieldLabel>
        <textarea
          id="work-project-description"
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder="Optional context or definition of done"
          rows={3}
          className="input resize-none"
        />
      </div>
    </>
  );
}

function ProgressFields({
  projectId,
  onProjectChange,
  projects,
  minutes,
  onMinutesChange,
  note,
  onNoteChange,
  invalid,
}: {
  projectId: string;
  onProjectChange: (value: string) => void;
  projects: Project[];
  minutes: number;
  onMinutesChange: (value: number) => void;
  note: string;
  onNoteChange: (value: string) => void;
  invalid: boolean;
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="work-progress-project">Project</FieldLabel>
        <select
          id="work-progress-project"
          data-autofocus
          value={projectId}
          onChange={(event) => onProjectChange(event.target.value)}
          aria-invalid={invalid || undefined}
          aria-errormessage={invalid ? 'work-logger-error' : undefined}
          className="input min-h-12 text-base"
        >
          <option value="">Choose a project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>
        {projects.length === 0 ? (
          <p className="text-[11px] text-subtle-foreground">
            Create a project in this organization before logging progress.
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="work-progress-minutes">Minutes</FieldLabel>
        <div className="grid grid-cols-4 gap-2">
          {[15, 30, 60].map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={minutes === value}
              onClick={() => onMinutesChange(value)}
              className={cn(
                'min-h-11 rounded-md border text-xs transition-colors',
                minutes === value
                  ? 'border-primary/55 bg-primary/10 text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {value}
            </button>
          ))}
          <input
            id="work-progress-minutes"
            type="number"
            min={1}
            max={1440}
            inputMode="numeric"
            value={minutes}
            onChange={(event) => onMinutesChange(Number(event.target.value))}
            aria-label="Custom minutes"
            aria-invalid={invalid || undefined}
            aria-errormessage={invalid ? 'work-logger-error' : undefined}
            className="input min-h-11 min-w-0 px-2 text-center"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor="work-progress-note">Progress note</FieldLabel>
        <textarea
          id="work-progress-note"
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="What moved forward?"
          rows={3}
          className="input resize-none"
        />
      </div>
    </>
  );
}
