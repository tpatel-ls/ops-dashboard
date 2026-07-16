'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
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
import { createProject } from '@/lib/projects';
import { destinationOrgId, resolveWorkDestination, type WorkDestination } from '@/lib/work-logger';
import { useAppStore } from '@/lib/app-store';
import { ProjectDetail } from '@/components/project-detail';
import { cn } from '@ops-dashboard/ui';
import {
  compareProjects,
  matchesProjectSearch,
  type ProjectSort,
} from '@/lib/project-query';

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
  active: 'text-success',
  paused: 'text-warning',
  done: 'text-muted-foreground',
  archived: 'text-subtle-foreground',
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const project = await createProject(name.trim(), {
        kind,
        domainId: domainId || undefined,
        orgId: destinationOrgId(destination),
        description: description.trim() || undefined,
      });
      onCreated(project);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      aria-label="Create project"
      onSubmit={handleSubmit}
      className="surface flex flex-col gap-3 p-4"
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
        New project
      </div>
      <label className="grid gap-1.5 text-xs text-muted-foreground">
        <span>Project name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name the outcome"
          className="input min-h-11 text-foreground"
          autoFocus
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1.5 text-xs text-muted-foreground">
          <span>Type</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as ProjectKind)}
            className="input min-h-11 text-foreground"
          >
            <option value="project">Project</option>
            <option value="area">Area</option>
            <option value="retainer">Retainer</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-xs text-muted-foreground">
          <span>Organization</span>
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="input min-h-11 text-foreground"
          >
            <option value="personal">Personal</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>{organization.name}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs text-muted-foreground">
          <span>Domain</span>
          <select
            value={domainId}
            onChange={(e) => setDomainId(e.target.value)}
            className="input min-h-11 text-foreground"
          >
            <option value="">No domain</option>
            {domains.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>
      </div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        rows={2}
        className="input resize-none"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
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
  taskCount: number;
  hoursLogged: number;
}

interface ProjectCardProps {
  data: ProjectCardData;
  onClick: () => void;
  onAddTask: () => void;
  onLogProgress: () => void;
  showOrganization: boolean;
}

function ProjectCard({ data, onClick, onAddTask, onLogProgress, showOrganization }: ProjectCardProps) {
  const { project, domain, organization, hoursLogged, taskCount } = data;

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
      className="surface-flat group overflow-hidden transition-all hover:border-border-strong hover:shadow-[0_4px_18px_-12px_rgba(0,0,0,0.45)]"
    >
      <button type="button" onClick={onClick} className="w-full px-4 py-3 text-left">
        {/* Top row */}
        <div className="flex items-start gap-2.5">
        <span
          className="mt-0.5 size-3.5 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]"
          style={{ background: project.color }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-[14px] font-medium leading-5">{project.name}</span>
            <span
              className={cn(
                'font-mono text-[10px] uppercase tracking-[0.14em]',
                STATUS_CLASSES[project.status],
              )}
            >
              {STATUS_LABELS[project.status]}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {showOrganization ? (
              <span className="inline-flex min-w-0 items-center gap-1 rounded-full border px-2 py-0.5">
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ background: organization?.color ?? PERSONAL_COLOR }}
                  aria-hidden
                />
                <span className="max-w-40 truncate font-mono text-[10px] text-subtle-foreground">
                  {organization?.name ?? 'Personal'}
                </span>
              </span>
            ) : null}
            {domain ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-bg-sunken px-2 py-0.5">
              <span
                className="size-1.5 rounded-full"
                style={{ background: domain.color }}
                aria-hidden
              />
              <span className="font-mono text-[10px] text-subtle-foreground">{domain.name}</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Milestone bar */}
        {milestonePct !== null ? (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-mono text-[10px] text-subtle-foreground">
              {milestoneDone}/{milestones.length} milestones
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">{milestonePct}%</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-bg-sunken">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${milestonePct}%` }}
            />
          </div>
        </div>
        ) : null}

      {/* Footer row */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-subtle-foreground">
        <span className="inline-flex items-center gap-1">
          <ListTodo className="size-3" aria-hidden />
          {taskCount} open task{taskCount === 1 ? '' : 's'}
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
            {formatDistanceToNow(lastWorked, { addSuffix: true })}
          </span>
        ) : null}

        {isSlipping && project.status === 'active' ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] text-warning">
            <AlertTriangle className="size-3" aria-hidden />
            Slipping
          </span>
        ) : null}
        </div>
      </button>
      <div className="hairline flex items-center justify-between border-t px-3 py-2">
        <button
          type="button"
          onClick={onAddTask}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10"
        >
          <Plus className="size-3.5" aria-hidden />
          Add task
        </button>
        <button
          type="button"
          onClick={onLogProgress}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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

  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex items-center gap-2 text-left"
      >
        <ChevronRight
          className={cn('size-3.5 text-muted-foreground transition-transform', !collapsed && 'rotate-90')}
          aria-hidden
        />
        <Icon className="size-3.5 text-muted-foreground" aria-hidden />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
          {KIND_LABELS[kind]}
        </span>
        <span className="font-mono text-[10px] text-subtle-foreground">
          ({items.length})
        </span>
      </button>

      {!collapsed ? (
        <div className="grid gap-1.5 lg:grid-cols-2">
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
        .then((all) => all.filter((organization) => !organization.deletedAt && !organization.archivedAt)),
      db.tasks.toArray().then((all) => all.filter((t) => !t.deletedAt && t.status !== 'archived' && t.status !== 'done')),
      db.workLogs.toArray().then((all) => all.filter((w) => !w.deletedAt)),
    ]);

    const domainMap = new Map(domains.map((d) => [d.id, d]));
    const organizationMap = new Map(organizations.map((organization) => [organization.id, organization]));

    const cardData: ProjectCardData[] = projects.map((project) => ({
      project,
      domain: project.domainId ? domainMap.get(project.domainId) : undefined,
      organization: project.orgId ? organizationMap.get(project.orgId) : undefined,
      taskCount: tasks.filter((t) => t.projectId === project.id).length,
      hoursLogged:
        workLogs
          .filter((w) => w.projectId === project.id)
          .reduce((acc, w) => acc + w.minutes, 0) / 60,
    }));

    return { cardData, domains, organizations };
  }, [ctx]);

  // When a project is updated (e.g. via ProjectDetail), refresh the selected project
  const liveSelectedProject = useLiveQuery(
    async () => {
      if (!selectedProject) return null;
      return getDb().projects.get(selectedProject.id) ?? null;
    },
    [selectedProject?.id],
  );

  const displayProject =
    liveSelectedProject !== undefined ? liveSelectedProject : selectedProject;

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

  const totalActive = filteredCardData.filter((c) => c.project.status === 'active').length;

  return (
    <>
      <div className="flex flex-col gap-5">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">{totalActive} active</span>
          <div className="relative ml-auto w-full sm:w-56">
            <label htmlFor="project-search" className="sr-only">Search projects</label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              id="project-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search projects"
              className="input min-h-11 pl-9 pr-10 sm:min-h-9"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear project search"
                title="Clear search"
                className="absolute right-1 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setCreating((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              creating
                ? 'bg-bg-sunken text-muted-foreground'
                : 'bg-primary text-primary-foreground hover:opacity-90',
            )}
          >
            {creating ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
            {creating ? 'Cancel' : 'New'}
          </button>
        </div>

        <div
          role="group"
          aria-label="Project status"
          className="inline-flex w-fit max-w-full items-center gap-0.5 overflow-x-auto rounded-[10px] border bg-bg-sunken p-0.5"
        >
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              aria-pressed={statusFilter === filter.id}
              onClick={() => setStatusFilter(filter.id)}
              className={cn(
                'min-h-11 rounded-[8px] px-3 text-xs font-medium transition-colors sm:min-h-9',
                statusFilter === filter.id
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <label className="flex w-fit items-center gap-2 text-xs text-muted-foreground">
          <span>Sort</span>
          <select
            value={projectSort}
            onChange={(event) => setProjectSort(event.target.value as ProjectSort)}
            className="input min-h-11 w-auto pr-8 sm:min-h-9"
          >
            <option value="name">Name</option>
            <option value="due">Due date</option>
            <option value="recent">Recent work</option>
          </select>
        </label>

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
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-subtle-foreground">
              projects
            </div>
            <h3 className="text-xl font-semibold tracking-tight">
              {searchQuery || statusFilter !== 'all' ? 'No matching projects.' : 'A clean slate.'}
            </h3>
            <p className="max-w-xs text-sm text-muted-foreground">
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
                onClick={() => openWorkLogger('project')}
                className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground"
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
