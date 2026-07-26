'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useRef, useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  ChevronRight,
  Clock,
  Layers,
  ListTodo,
  Plus,
  RefreshCw,
  Search,
  Timer,
  X,
} from 'lucide-react';
import { differenceInDays, format, formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { getDb, matchesOrgContext, PERSONAL_COLOR } from '@ops-dashboard/core';
import type {
  Domain,
  Organization,
  Project,
  ProjectKind,
  ProjectStatus,
} from '@ops-dashboard/core';
import { useOrgStore } from '@/lib/org-store';
import { createProject, projectTaskProgress, type ProjectTaskProgress } from '@/lib/projects';
import { destinationOrgId, resolveWorkDestination, type WorkDestination } from '@/lib/work-logger';
import { useAppStore } from '@/lib/app-store';
import { ProjectDetail } from '@/components/project-detail';
import { cn } from '@ops-dashboard/ui';
import { compareProjects, matchesProjectSearch, type ProjectSort } from '@/lib/project-query';

// ─── Constants ────────────────────────────────────────────────────────────────

const KIND_ORDER: ProjectKind[] = ['project', 'area', 'retainer'];

const KIND_LABELS: Record<ProjectKind, string> = {
  project: 'Projects',
  area: 'Areas',
  retainer: 'Retainers',
};

const KIND_ICONS: Record<ProjectKind, typeof Boxes> = {
  project: Layers,
  area: Boxes,
  retainer: RefreshCw,
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  done: 'Done',
  archived: 'Archived',
};

const STATUS_CLASSES: Record<ProjectStatus, string> = {
  active: 'border-success/30 bg-success/10 text-success',
  paused: 'border-warning/30 bg-warning/10 text-warning',
  done: 'border-border bg-bg-sunken text-muted-foreground',
  archived: 'border-border bg-bg-sunken text-subtle-foreground',
};

const SLIPPING_DAYS = 5;
type ProjectStatusFilter = 'all' | Exclude<ProjectStatus, 'archived'>;
const STATUS_FILTERS: Array<{ id: ProjectStatusFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'paused', label: 'Paused' },
  { id: 'done', label: 'Done' },
];

// ─── Create project form ──────────────────────────────────────────────────────

interface CreateProjectFormProps {
  domains: Domain[];
  organizations: Organization[];
  initialDestination: WorkDestination;
  onCreated: (project: Project) => void;
  onCancel: () => void;
}

function CreateProjectForm({
  domains,
  organizations,
  initialDestination,
  onCreated,
  onCancel,
}: CreateProjectFormProps) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<ProjectKind>('project');
  const [domainId, setDomainId] = useState('');
  const [destination, setDestination] = useState<WorkDestination>(initialDestination);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const destinationOrganization = organizations.find(
    (organization) => organization.id === destination,
  );
  const destinationName = destinationOrganization?.name ?? 'Personal';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const project = await createProject(name.trim(), {
        kind,
        domainId: domainId || undefined,
        orgId: destinationOrgId(destination),
        description: description.trim() || undefined,
      });
      onCreated(project);
    } catch {
      setError('Could not create the project. Your details are still here.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      aria-label="Create project"
      onSubmit={handleSubmit}
      className="surface flex flex-col gap-3 p-3 sm:p-4"
    >
      <div className="border-border/70 flex items-center gap-2 border-b pb-3">
        <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-md">
          <Layers className="size-4" aria-hidden />
        </span>
        <div>
          <h2 className="text-sm font-semibold">Create project</h2>
          <p className="text-muted-foreground text-xs">Define the outcome, owner, and work lane.</p>
        </div>
      </div>
      <div
        role="status"
        className="bg-bg-sunken text-muted-foreground inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs"
      >
        <span
          className="size-2 rounded-full"
          style={{ background: destinationOrganization?.color ?? PERSONAL_COLOR }}
          aria-hidden
        />
        Creating in <span className="text-foreground font-medium">{destinationName}</span>
      </div>
      {error ? (
        <p role="alert" className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-xs">
          {error}
        </p>
      ) : null}
      <label className="text-muted-foreground grid gap-1.5 text-xs">
        <span>Project name</span>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          placeholder="Name the outcome"
          className="input text-foreground min-h-10"
          autoFocus
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-muted-foreground grid gap-1.5 text-xs">
          <span>Type</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as ProjectKind)}
            className="input text-foreground min-h-10"
          >
            <option value="project">Project</option>
            <option value="area">Area</option>
            <option value="retainer">Retainer</option>
          </select>
        </label>
        <label className="text-muted-foreground grid gap-1.5 text-xs">
          <span>Organization</span>
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="input text-foreground min-h-10"
          >
            <option value="personal">Personal</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-muted-foreground grid gap-1.5 text-xs">
          <span>Domain</span>
          <select
            value={domainId}
            onChange={(e) => setDomainId(e.target.value)}
            className="input text-foreground min-h-10"
          >
            <option value="">No domain</option>
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Outcome or definition of done (optional)"
        aria-label="Outcome or definition of done"
        rows={2}
        className="input resize-none"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-muted-foreground hover:bg-accent hover:text-foreground min-h-10 rounded-md px-3 text-xs"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="bg-primary text-primary-foreground min-h-10 rounded-md px-3 text-xs font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Create project
        </button>
      </div>
    </form>
  );
}

// ─── Project card ─────────────────────────────────────────────────────────────

interface ProjectCardData {
  project: Project;
  domain?: Domain;
  organization?: Organization;
  taskProgress: ProjectTaskProgress;
  hoursLogged: number;
}

interface ProjectCardProps {
  data: ProjectCardData;
  onClick: () => void;
  onAddTask: () => void;
  onLogProgress: () => void;
  showOrganization: boolean;
}

function ProjectCard({
  data,
  onClick,
  onAddTask,
  onLogProgress,
  showOrganization,
}: ProjectCardProps) {
  const { project, domain, organization, hoursLogged, taskProgress } = data;

  const milestones = project.milestones ?? [];
  const milestoneDone = milestones.filter((m) => m.done).length;
  const milestonePct =
    milestones.length > 0 ? Math.round((milestoneDone / milestones.length) * 100) : null;

  const lastWorked = project.lastWorkedAt ? parseISO(project.lastWorkedAt) : null;
  const daysAgo = lastWorked ? differenceInDays(new Date(), lastWorked) : null;
  const isSlipping = daysAgo === null || daysAgo > SLIPPING_DAYS;
  const parsedDueDate = project.dueDate ? parseISO(project.dueDate) : null;
  const dueLabel = parsedDueDate && isValid(parsedDueDate) ? format(parsedDueDate, 'MMM d') : null;
  const isOverdue = Boolean(
    dueLabel && project.dueDate && project.dueDate < format(new Date(), 'yyyy-MM-dd'),
  );

  return (
    <article
      data-project-card
      className="surface-flat group hover:border-border-strong overflow-hidden transition-all hover:shadow-[0_4px_18px_-12px_rgba(0,0,0,0.45)]"
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={`Open project ${project.name}`}
        className="w-full px-4 py-3 text-left"
      >
        {/* Top row */}
        <div className="flex items-start gap-2.5">
          <span
            className="mt-0.5 size-3.5 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]"
            style={{ background: project.color }}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-[14px] leading-5 font-medium">{project.name}</span>
              <span
                className={cn(
                  'rounded-md border px-1.5 py-0.5 text-[10px] font-semibold',
                  STATUS_CLASSES[project.status],
                )}
              >
                {STATUS_LABELS[project.status]}
              </span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {showOrganization ? (
                <span className="inline-flex min-w-0 items-center gap-1 rounded-md border px-2 py-0.5">
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ background: organization?.color ?? PERSONAL_COLOR }}
                    aria-hidden
                  />
                  <span className="text-subtle-foreground max-w-40 truncate text-[10px]">
                    Org: {organization?.name ?? 'Personal'}
                  </span>
                </span>
              ) : null}
              {domain ? (
                <span className="bg-bg-sunken inline-flex items-center gap-1 rounded-md px-2 py-0.5">
                  <span
                    className="size-1.5 rounded-full"
                    style={{ background: domain.color }}
                    aria-hidden
                  />
                  <span className="text-subtle-foreground text-[10px]">Domain: {domain.name}</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Milestone bar */}
        {milestonePct !== null ? (
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-subtle-foreground font-mono text-[10px]">
                {milestoneDone}/{milestones.length} milestones
              </span>
              <span className="text-muted-foreground font-mono text-[10px]">{milestonePct}%</span>
            </div>
            <div className="bg-bg-sunken h-1 w-full overflow-hidden rounded-full">
              <div
                role="progressbar"
                aria-label={`${project.name} milestone progress`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={milestonePct}
                className="bg-primary h-full rounded-full transition-all"
                style={{ width: `${milestonePct}%` }}
              />
            </div>
          </div>
        ) : null}

        {taskProgress.total > 0 ? (
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-[10px]">
              <span className="text-subtle-foreground">
                {taskProgress.open} open · {taskProgress.done} done
              </span>
              <span className="text-muted-foreground tabular-nums">{taskProgress.percent}%</span>
            </div>
            <div className="bg-bg-sunken h-1 w-full overflow-hidden rounded-full">
              <div
                role="progressbar"
                aria-label={`${project.name} task progress`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={taskProgress.percent}
                className="bg-success h-full rounded-full transition-all"
                style={{ width: `${taskProgress.percent}%` }}
              />
            </div>
          </div>
        ) : null}

        {/* Footer row */}
        <div className="text-subtle-foreground mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
          <span className="inline-flex items-center gap-1">
            <ListTodo className="size-3" aria-hidden />
            {taskProgress.open} open task{taskProgress.open === 1 ? '' : 's'}
          </span>
          {dueLabel ? (
            <span className={cn('inline-flex items-center gap-1', isOverdue && 'text-destructive')}>
              <CalendarClock className="size-3" aria-hidden />
              Due {dueLabel}
            </span>
          ) : null}
          {hoursLogged > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" aria-hidden />
              {hoursLogged.toFixed(1)}h logged
            </span>
          ) : null}

          {lastWorked ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" aria-hidden />
              Worked {formatDistanceToNow(lastWorked, { addSuffix: true })}
            </span>
          ) : null}

          {isSlipping && project.status === 'active' ? (
            <span className="bg-warning/15 text-warning inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]">
              <AlertTriangle className="size-3" aria-hidden />
              {lastWorked ? 'Needs update' : 'No work logged'}
            </span>
          ) : null}
        </div>
      </button>
      <div className="hairline grid grid-cols-2 border-t p-1.5">
        <button
          type="button"
          onClick={onAddTask}
          className="text-primary hover:bg-primary/10 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md px-2 text-[11px] font-medium transition-colors"
        >
          <Plus className="size-3.5" aria-hidden />
          Add task
        </button>
        <button
          type="button"
          onClick={onLogProgress}
          className="text-muted-foreground hover:bg-accent hover:text-foreground inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md px-2 text-[11px] font-medium transition-colors"
        >
          <Timer className="size-3.5" aria-hidden />
          Log progress
        </button>
      </div>
    </article>
  );
}

// ─── Kind group ───────────────────────────────────────────────────────────────

function KindGroup({
  kind,
  items,
  onCardClick,
  onAddTask,
  onLogProgress,
  showOrganization,
}: {
  kind: ProjectKind;
  items: ProjectCardData[];
  onCardClick: (project: Project) => void;
  onAddTask: (project: Project) => void;
  onLogProgress: (project: Project) => void;
  showOrganization: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const Icon = KIND_ICONS[kind];
  const listId = `project-group-${kind}`;

  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        aria-expanded={!collapsed}
        aria-controls={listId}
        className="border-border/70 flex min-h-10 w-full items-center gap-2 border-b pb-2 text-left"
      >
        <span className="bg-bg-sunken text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-md">
          <Icon className="size-3.5" aria-hidden />
        </span>
        <span className="text-foreground text-xs font-semibold">{KIND_LABELS[kind]}</span>
        <span className="bg-card text-subtle-foreground rounded-md border px-1.5 py-0.5 font-mono text-[10px] tabular-nums">
          {items.length}
        </span>
        <ChevronRight
          className={cn(
            'text-muted-foreground ml-auto size-3.5 transition-transform',
            !collapsed && 'rotate-90',
          )}
          aria-hidden
        />
      </button>

      {!collapsed ? (
        <div id={listId} className="grid gap-1.5 lg:grid-cols-2">
          {items.map((item) => (
            <ProjectCard
              key={item.project.id}
              data={item}
              onClick={() => onCardClick(item.project)}
              onAddTask={() => onAddTask(item.project)}
              onLogProgress={() => onLogProgress(item.project)}
              showOrganization={showOrganization}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function ProjectsBoard() {
  const [creating, setCreating] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatusFilter>('all');
  const [projectSort, setProjectSort] = useState<ProjectSort>('name');
  const searchRef = useRef<HTMLInputElement>(null);
  const ctx = useOrgStore((s) => s.ctx);
  const openWorkLogger = useAppStore((state) => state.openWorkLogger);

  const data = useLiveQuery(async () => {
    const db = getDb();
    const [projects, domains, organizations, tasks, workLogs] = await Promise.all([
      db.projects
        .toArray()
        .then((all) =>
          all.filter((p) => !p.deletedAt && !p.archivedAt && matchesOrgContext(p.orgId, ctx)),
        ),
      db.domains.toArray().then((all) => all.filter((d) => !d.deletedAt)),
      db.organizations
        .toArray()
        .then((all) =>
          all.filter((organization) => !organization.deletedAt && !organization.archivedAt),
        ),
      db.tasks.toArray(),
      db.workLogs.toArray().then((all) => all.filter((w) => !w.deletedAt)),
    ]);

    const domainMap = new Map(domains.map((d) => [d.id, d]));
    const organizationMap = new Map(
      organizations.map((organization) => [organization.id, organization]),
    );

    const cardData: ProjectCardData[] = projects.map((project) => ({
      project,
      domain: project.domainId ? domainMap.get(project.domainId) : undefined,
      organization: project.orgId ? organizationMap.get(project.orgId) : undefined,
      taskProgress: projectTaskProgress(tasks, project.id),
      hoursLogged:
        workLogs.filter((w) => w.projectId === project.id).reduce((acc, w) => acc + w.minutes, 0) /
        60,
    }));

    return { cardData, domains, organizations };
  }, [ctx]);

  // When a project is updated (e.g. via ProjectDetail), refresh the selected project
  const liveSelectedProject = useLiveQuery(async () => {
    if (!selectedProject) return null;
    return getDb().projects.get(selectedProject.id) ?? null;
  }, [selectedProject?.id]);

  const displayProject = liveSelectedProject !== undefined ? liveSelectedProject : selectedProject;

  const filteredCardData = (data?.cardData ?? [])
    .filter(
      ({ project }) =>
        matchesProjectSearch(project, searchQuery) &&
        (statusFilter === 'all' || project.status === statusFilter),
    )
    .sort((a, b) => compareProjects(a.project, b.project, projectSort));

  const grouped = KIND_ORDER.reduce<Record<ProjectKind, ProjectCardData[]>>(
    (acc, k) => {
      acc[k] = filteredCardData.filter((c) => c.project.kind === k);
      return acc;
    },
    { project: [], area: [], retainer: [] },
  );

  return (
    <>
      <div className="flex flex-col gap-5">
        <section aria-label="Project controls" className="surface flex flex-col gap-3 p-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="border-border bg-input focus-within:border-ring flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border px-3 transition-colors focus-within:shadow-[0_0_0_3px_color-mix(in_oklch,var(--ring)_18%,transparent)] sm:min-h-9 sm:max-w-sm">
              <label htmlFor="project-search" className="sr-only">
                Search projects
              </label>
              <Search
                className="text-muted-foreground pointer-events-none size-3.5 shrink-0"
                aria-hidden
              />
              <input
                ref={searchRef}
                id="project-search"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search projects and outcomes"
                className="text-foreground placeholder:text-subtle-foreground min-w-0 flex-1 bg-transparent text-[13px] outline-none"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchRef.current?.focus();
                  }}
                  aria-label="Clear project search"
                  title="Clear search"
                  className="text-muted-foreground hover:text-foreground -mr-2 inline-flex size-9 shrink-0 items-center justify-center rounded-md"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setCreating((v) => !v)}
              className={cn(
                'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors sm:min-h-9',
                creating
                  ? 'bg-bg-sunken text-muted-foreground'
                  : 'bg-primary text-primary-foreground hover:opacity-90',
              )}
            >
              {creating ? (
                <X className="size-3.5" aria-hidden />
              ) : (
                <Plus className="size-3.5" aria-hidden />
              )}
              {creating ? (
                'Cancel'
              ) : (
                <>
                  <span className="hidden sm:inline">New project</span>
                  <span className="sm:hidden">New</span>
                </>
              )}
            </button>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Project status"
              className="bg-bg-sunken grid w-full grid-cols-4 items-center gap-0.5 rounded-lg border p-0.5 sm:w-auto"
            >
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  aria-pressed={statusFilter === filter.id}
                  onClick={() => setStatusFilter(filter.id)}
                  className={cn(
                    'min-h-10 rounded-md px-3 text-xs font-medium transition-colors sm:min-h-8',
                    statusFilter === filter.id
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <label className="text-muted-foreground flex min-h-10 items-center gap-2 text-xs sm:min-h-8">
              <span>Sort</span>
              <select
                value={projectSort}
                onChange={(event) => setProjectSort(event.target.value as ProjectSort)}
                className="input min-h-10 w-auto pr-8 sm:min-h-8"
              >
                <option value="name">Name</option>
                <option value="due">Due date</option>
                <option value="recent">Recent work</option>
              </select>
            </label>
            <span
              role="status"
              aria-live="polite"
              className="text-subtle-foreground ml-auto font-mono text-[11px] uppercase"
            >
              {filteredCardData.length} shown
            </span>
          </div>
        </section>

        {creating ? (
          <CreateProjectForm
            domains={data?.domains ?? []}
            organizations={data?.organizations ?? []}
            initialDestination={resolveWorkDestination(
              ctx,
              null,
              (data?.organizations ?? []).map((organization) => organization.id),
            )}
            onCreated={(project) => {
              setCreating(false);
              setSelectedProject(project);
            }}
            onCancel={() => setCreating(false)}
          />
        ) : null}

        {data === undefined ? (
          <div className="grid gap-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                aria-hidden
                className="surface-flat h-20 animate-pulse"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
        ) : filteredCardData.length === 0 && !creating ? (
          <div className="surface flex h-64 flex-col items-center justify-center gap-2 text-center">
            <div className="text-subtle-foreground font-mono text-[10px] uppercase">projects</div>
            <h3 className="text-xl font-semibold">
              {searchQuery || statusFilter !== 'all' ? 'No matching projects.' : 'A clean slate.'}
            </h3>
            <p className="text-muted-foreground max-w-xs text-sm">
              {searchQuery || statusFilter !== 'all'
                ? 'Try a different search or project status.'
                : 'Create your first project, area, or retainer to track work and log hours.'}
            </p>
            {searchQuery || statusFilter !== 'all' ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="mt-2 min-h-11 rounded-md border px-4 text-xs font-medium"
              >
                Clear filters
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="bg-primary text-primary-foreground mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-md px-4 text-xs font-medium"
              >
                <Plus className="size-3.5" aria-hidden />
                Create project
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {KIND_ORDER.map((kind) => (
              <KindGroup
                key={kind}
                kind={kind}
                items={grouped[kind]}
                onCardClick={setSelectedProject}
                onAddTask={(project) => openWorkLogger('task', project.id)}
                onLogProgress={(project) => openWorkLogger('progress', project.id)}
                showOrganization={ctx === 'all'}
              />
            ))}
          </div>
        )}
      </div>

      {displayProject ? (
        <ProjectDetail
          project={displayProject}
          domains={data?.domains ?? []}
          onClose={() => setSelectedProject(null)}
        />
      ) : null}
    </>
  );
}
