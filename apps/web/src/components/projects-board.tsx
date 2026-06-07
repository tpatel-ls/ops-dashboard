'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  ChevronDown,
  ChevronRight,
  Clock,
  Layers,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react';
import { formatDistanceToNow, parseISO, differenceInDays } from 'date-fns';
import { getDb } from '@drift/core';
import type { Domain, Project, ProjectKind, ProjectStatus } from '@drift/core';
import { createProject } from '@/lib/projects';
import { patchRecord } from '@/lib/records';
import { ProjectDetail } from '@/components/project-detail';
import { cn } from '@drift/ui';

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

// ─── Create project form ──────────────────────────────────────────────────────

interface CreateProjectFormProps {
  domains: Domain[];
  onCreated: (project: Project) => void;
  onCancel: () => void;
}

function CreateProjectForm({ domains, onCreated, onCancel }: CreateProjectFormProps) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<ProjectKind>('project');
  const [domainId, setDomainId] = useState('');
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
        description: description.trim() || undefined,
      });
      onCreated(project);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="surface flex flex-col gap-3 p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
        New project
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        className="input"
        autoFocus
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as ProjectKind)}
          className="input"
        >
          <option value="project">Project</option>
          <option value="area">Area</option>
          <option value="retainer">Retainer</option>
        </select>
        <select
          value={domainId}
          onChange={(e) => setDomainId(e.target.value)}
          className="input"
        >
          <option value="">— no domain —</option>
          {domains.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
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
          Create
        </button>
      </div>
    </form>
  );
}

// ─── Project card ─────────────────────────────────────────────────────────────

interface ProjectCardData {
  project: Project;
  domain?: Domain;
  taskCount: number;
  hoursLogged: number;
}

interface ProjectCardProps {
  data: ProjectCardData;
  onClick: () => void;
}

function ProjectCard({ data, onClick }: ProjectCardProps) {
  const { project, domain, hoursLogged } = data;

  const milestones = project.milestones ?? [];
  const milestoneDone = milestones.filter((m) => m.done).length;
  const milestonePct =
    milestones.length > 0 ? Math.round((milestoneDone / milestones.length) * 100) : null;

  const lastWorked = project.lastWorkedAt ? parseISO(project.lastWorkedAt) : null;
  const daysAgo = lastWorked ? differenceInDays(new Date(), lastWorked) : null;
  const isSlipping = daysAgo === null || daysAgo > SLIPPING_DAYS;

  return (
    <button
      type="button"
      onClick={onClick}
      className="surface-flat group w-full cursor-pointer px-4 py-3 text-left transition-all hover:border-border-strong hover:shadow-[0_4px_18px_-12px_rgba(0,0,0,0.45)]"
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

          {/* Domain chip */}
          {domain ? (
            <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-bg-sunken px-2 py-0.5">
              <span
                className="size-1.5 rounded-full"
                style={{ background: domain.color }}
                aria-hidden
              />
              <span className="font-mono text-[10px] text-subtle-foreground">{domain.name}</span>
            </div>
          ) : null}
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
  );
}

// ─── Kind group ───────────────────────────────────────────────────────────────

function KindGroup({
  kind,
  items,
  onCardClick,
}: {
  kind: ProjectKind;
  items: ProjectCardData[];
  onCardClick: (project: Project) => void;
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
            <ProjectCard key={item.project.id} data={item} onClick={() => onCardClick(item.project)} />
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

  const data = useLiveQuery(async () => {
    const db = getDb();
    const [projects, domains, tasks, workLogs] = await Promise.all([
      db.projects.toArray().then((all) => all.filter((p) => !p.deletedAt && !p.archivedAt)),
      db.domains.toArray().then((all) => all.filter((d) => !d.deletedAt)),
      db.tasks.toArray().then((all) => all.filter((t) => !t.deletedAt && t.status !== 'archived' && t.status !== 'done')),
      db.workLogs.toArray().then((all) => all.filter((w) => !w.deletedAt)),
    ]);

    const domainMap = new Map(domains.map((d) => [d.id, d]));

    const cardData: ProjectCardData[] = projects.map((project) => ({
      project,
      domain: project.domainId ? domainMap.get(project.domainId) : undefined,
      taskCount: tasks.filter((t) => t.projectId === project.id).length,
      hoursLogged:
        workLogs
          .filter((w) => w.projectId === project.id)
          .reduce((acc, w) => acc + w.minutes, 0) / 60,
    }));

    return { cardData, domains };
  });

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

  const grouped = KIND_ORDER.reduce<Record<ProjectKind, ProjectCardData[]>>(
    (acc, k) => {
      acc[k] = (data?.cardData ?? []).filter((c) => c.project.kind === k);
      return acc;
    },
    { project: [], area: [], retainer: [] },
  );

  const totalActive = (data?.cardData ?? []).filter((c) => c.project.status === 'active').length;

  return (
    <>
      <div className="flex flex-col gap-5">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {totalActive} active
          </span>
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

        {creating ? (
          <CreateProjectForm
            domains={data?.domains ?? []}
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
        ) : data.cardData.length === 0 && !creating ? (
          <div className="surface flex h-64 flex-col items-center justify-center gap-2 text-center">
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-subtle-foreground">
              projects
            </div>
            <h3 className="text-xl font-semibold tracking-tight">A clean slate.</h3>
            <p className="max-w-xs text-sm text-muted-foreground">
              Create your first project, area, or retainer to track work and log hours.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {KIND_ORDER.map((kind) => (
              <KindGroup
                key={kind}
                kind={kind}
                items={grouped[kind]}
                onCardClick={setSelectedProject}
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
