'use client';

import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getDb, matchesOrgContext } from '@ops-dashboard/core';
import type { Task, Priority } from '@ops-dashboard/core';
import { format, parseISO, isToday, isPast } from 'date-fns';
import { CalendarClock, Check, Star, ChevronDown, Circle, Plus, Search, X } from 'lucide-react';
import { cn } from '@ops-dashboard/ui';
import { setTaskStatus, updateTask } from '@/lib/tasks';
import { useAppStore } from '@/lib/app-store';
import { taskLane } from '@/lib/org-lanes';
import { useOrgStore } from '@/lib/org-store';
import { isActiveProject } from '@/lib/project-query';
import { compareTasks, matchesTaskSearch } from '@/lib/task-query';
import { QuickTaskEntry } from '@/components/quick-task-entry';

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilter = 'open' | 'done' | 'all';

const STATUS_TABS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'open', label: 'Open' },
  { id: 'done', label: 'Done' },
  { id: 'all', label: 'All' },
];

// ─── Priority helpers ────────────────────────────────────────────────────────

const PRIORITY_CLASS: Record<Priority, string> = {
  0: '',
  1: 'border-priority-low/30 bg-priority-low/10 text-priority-low',
  2: 'border-priority-med/30 bg-priority-med/10 text-priority-med',
  3: 'border-priority-urgent/30 bg-priority-urgent/10 text-priority-urgent',
};

const PRIORITY_LABEL: Record<Priority, string> = {
  0: 'Normal',
  1: 'Low',
  2: 'Important',
  3: 'Critical',
};

// ─── Dropdown ────────────────────────────────────────────────────────────────

interface DropdownProps {
  label: string;
  value: string | null;
  options: Array<{ id: string; name: string; color?: string }>;
  onChange: (id: string | null) => void;
  placeholder: string;
}

function FilterDropdown({ label, value, options, onChange, placeholder }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`${label} filter`}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'inline-flex min-h-10 max-w-44 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-all sm:min-h-8',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
          value
            ? 'border-primary/40 bg-primary-soft text-primary'
            : 'border-border bg-card text-muted-foreground hover:border-border-strong hover:text-foreground',
        )}
      >
        {selected ? (
          <>
            {selected.color && (
              <span
                className="size-2 rounded-full"
                style={{ background: selected.color }}
                aria-hidden
              />
            )}
            <span className="max-w-[120px] truncate">{selected.name}</span>
          </>
        ) : (
          <span>{label}</span>
        )}
        <ChevronDown className={cn('size-3 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute top-full left-0 z-20 mt-1.5 min-w-[160px] overflow-hidden rounded-md border border-border bg-card shadow-[0_8px_30px_-8px_rgba(0,0,0,0.25)]">
            <ul role="listbox" aria-label={`${label} options`} className="max-h-60 overflow-y-auto py-1 scrollbar-thin">
              <li>
                <button
                  type="button"
                  onClick={() => { onChange(null); setOpen(false); }}
                  role="option"
                  aria-selected={!value}
                  className={cn(
                    'min-h-9 w-full px-3 py-1.5 text-left text-[13px] text-muted-foreground transition-colors hover:bg-bg-sunken',
                    !value && 'text-foreground font-medium',
                  )}
                >
                  {placeholder}
                </button>
              </li>
              {options.map((opt) => (
                <li key={opt.id}>
                  <button
                    type="button"
                    onClick={() => { onChange(opt.id); setOpen(false); }}
                    role="option"
                    aria-selected={value === opt.id}
                    className={cn(
                      'flex min-h-9 w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] transition-colors hover:bg-bg-sunken',
                      value === opt.id ? 'text-primary font-medium' : 'text-foreground',
                    )}
                  >
                    {opt.color && (
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: opt.color }}
                        aria-hidden
                      />
                    )}
                    <span className="truncate">{opt.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Task Row ────────────────────────────────────────────────────────────────

interface TaskRowProps {
  task: Task;
  projectName?: string;
  projectColor?: string;
  domainName?: string;
  domainColor?: string;
}

function TaskRow({ task, projectName, projectColor, domainName, domainColor }: TaskRowProps) {
  const done = task.status === 'done';
  const openEdit = useAppStore((s) => s.openEdit);

  const dueChipClass = useMemo(() => {
    if (!task.dueAt) return '';
    const due = parseISO(task.dueAt);
    if (done) return 'border-border bg-bg-sunken text-muted-foreground';
    if (isPast(due) && !isToday(due)) return 'border-destructive/30 bg-destructive/10 text-destructive font-semibold';
    if (isToday(due)) return 'border-warning/30 bg-warning/10 text-warning font-semibold';
    return 'border-border bg-bg-sunken text-muted-foreground';
  }, [task.dueAt, done]);

  return (
    <li
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        openEdit(task.id);
      }}
      className={cn(
        'group surface-flat relative flex cursor-pointer items-start gap-2.5 px-3 py-3 transition-all sm:gap-3 sm:px-4',
        'hover:border-border-strong hover:shadow-[0_4px_18px_-12px_rgba(0,0,0,0.45)]',
        done && 'opacity-60',
      )}
    >
      {/* Priority bar */}
      <span
        aria-hidden
        className={cn(
          'absolute inset-y-2 left-0 w-[3px] rounded-r-full transition-opacity',
          task.priority === 1 && 'bg-priority-low',
          task.priority === 2 && 'bg-priority-med',
          task.priority === 3 && 'bg-priority-urgent',
          task.priority === 0 && 'opacity-0',
        )}
      />

      {/* Checkbox */}
      <button
        type="button"
        onClick={() => setTaskStatus(task.id, done ? 'todo' : 'done')}
        className={cn(
          '-ml-2 -mt-1.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full transition-colors',
          done
            ? 'text-primary'
            : 'text-muted-foreground hover:bg-primary/10 hover:text-primary',
        )}
        aria-label={done ? 'Mark as todo' : 'Mark as done'}
      >
        <span
          className={cn(
            'inline-flex size-5 items-center justify-center rounded-full border',
            done ? 'border-primary bg-primary text-primary-foreground' : 'border-current text-transparent',
          )}
          aria-hidden
        >
          <Check className="size-3" strokeWidth={3} />
        </span>
      </button>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              'line-clamp-2 text-[14px] leading-5',
              done && 'text-muted-foreground line-through decoration-muted-foreground/50',
            )}
          >
            {task.title}
          </span>
          {task.priority > 0 && (
            <span
              className={cn(
                'shrink-0 rounded-md border px-1.5 py-1 text-[10px] font-semibold leading-none',
                PRIORITY_CLASS[task.priority],
              )}
              aria-label={`Priority: ${PRIORITY_LABEL[task.priority]}`}
            >
              {PRIORITY_LABEL[task.priority]}
            </span>
          )}
        </div>

        {/* Meta row */}
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          {task.dueAt && (
            <span className={cn('inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px]', dueChipClass)}>
              <CalendarClock className="size-3" aria-hidden />
              Due {format(parseISO(task.dueAt), 'MMM d')}
            </span>
          )}
          {task.scheduledFor && !task.dueAt && (
            <span className="inline-flex items-center gap-1 rounded-md bg-bg-sunken px-1.5 py-0.5 text-[10px] text-subtle-foreground">
              <CalendarClock className="size-3" aria-hidden />
              {format(parseISO(`${task.scheduledFor}T00:00:00`), 'EEE d MMM')}
            </span>
          )}
          {projectName && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">
              {projectColor && (
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: projectColor }}
                  aria-hidden
                />
              )}
              {projectName}
            </span>
          )}
          {domainName && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
              {domainColor && (
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: domainColor }}
                  aria-hidden
                />
              )}
              {domainName}
            </span>
          )}
        </div>
      </div>

      {/* Star toggle */}
      <button
        type="button"
        onClick={() => updateTask(task.id, { starred: !task.starred })}
        className={cn(
          'touch-action-reveal mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md transition-all',
          'opacity-0 group-hover:opacity-100',
          task.starred && 'opacity-100 text-warning',
          !task.starred && 'text-muted-foreground hover:text-warning',
        )}
        aria-label={task.starred ? 'Unstar task' : 'Star task'}
      >
        <Star
          className="size-3.5"
          aria-hidden
          fill={task.starred ? 'currentColor' : 'none'}
        />
      </button>
    </li>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({
  statusFilter,
  onCreate,
}: {
  statusFilter: StatusFilter;
  onCreate: () => void;
}) {
  const heading =
    statusFilter === 'done'
      ? 'No completed tasks yet.'
      : statusFilter === 'open'
        ? 'No open tasks.'
        : 'No tasks found.';
  const body =
    statusFilter === 'done'
      ? 'Complete some tasks and they will appear here.'
      : statusFilter === 'open'
        ? 'Capture the next action while it is clear.'
        : 'Change the filters or capture a new task.';
  return (
    <div className="surface flex min-h-40 flex-col items-center justify-center gap-2 p-6 text-center">
      <span className="flex size-9 items-center justify-center rounded-lg bg-bg-sunken text-muted-foreground">
        <Circle className="size-4" aria-hidden />
      </span>
      <h3 className="text-base font-semibold">{heading}</h3>
      <p className="max-w-md text-sm text-muted-foreground">{body}</p>
      {statusFilter !== 'done' ? (
        <button
          type="button"
          onClick={onCreate}
          className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground"
        >
          <Plus className="size-3.5" aria-hidden />
          Create task
        </button>
      ) : null}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <ul className="flex flex-col gap-1.5">
      {Array.from({ length: 4 }).map((_, i) => (
        <li
          key={i}
          aria-hidden
          className="surface-flat h-16 animate-pulse"
          style={{ animationDelay: `${i * 60}ms` }}
        />
      ))}
    </ul>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function TasksView() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [domainFilter, setDomainFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const ctx = useOrgStore((s) => s.ctx);
  const openWorkLogger = useAppStore((state) => state.openWorkLogger);

  // Load all data
  const data = useLiveQuery(async () => {
    const db = getDb();
    const [allTasks, allProjects, allDomains] = await Promise.all([
      db.tasks.toArray(),
      db.projects.toArray(),
      db.domains.toArray(),
    ]);

    const activeProjects = allProjects.filter(isActiveProject);
    const activeDomains = allDomains.filter((d) => !d.deletedAt);

    // Maps for fast lookup
    const projectMap = new Map(activeProjects.map((p) => [p.id, p]));
    const domainMap = new Map(activeDomains.map((d) => [d.id, d]));

    return { allTasks, activeProjects, activeDomains, projectMap, domainMap };
  });

  const effectiveProjectFilter =
    projectFilter &&
    data?.activeProjects.some(
      (project) => project.id === projectFilter && matchesOrgContext(project.orgId, ctx),
    )
      ? projectFilter
      : null;

  // Filtered + sorted tasks (computed from live data + filter state)
  const filteredTasks = useMemo(() => {
    if (!data) return null;
    const { allTasks, projectMap, domainMap } = data;

    let tasks = allTasks.filter((t) => !t.deletedAt && t.status !== 'archived');

    // Org context (top-bar switcher). Lane falls back through the project for
    // records created before orgId denormalization.
    tasks = tasks.filter((t) => matchesOrgContext(taskLane(t, projectMap), ctx));

    // Status filter
    if (statusFilter === 'open') {
      tasks = tasks.filter((t) => t.status !== 'done');
    } else if (statusFilter === 'done') {
      tasks = tasks.filter((t) => t.status === 'done');
    }

    // Project filter
    if (effectiveProjectFilter) {
      tasks = tasks.filter((t) => t.projectId === effectiveProjectFilter);
    }

    // Domain filter
    if (domainFilter) {
      tasks = tasks.filter((t) => {
        if (t.domainId === domainFilter) return true;
        // Also match via project's domain
        if (t.projectId) {
          const proj = projectMap.get(t.projectId);
          if (proj && proj.domainId === domainFilter) return true;
        }
        return false;
      });
    }

    if (searchQuery.trim()) {
      tasks = tasks.filter((task) =>
        matchesTaskSearch(
          task,
          searchQuery,
          task.projectId ? projectMap.get(task.projectId)?.name : undefined,
        ),
      );
    }

    tasks.sort(compareTasks);

    // Attach lookup info
    return tasks.map((t) => ({
      task: t,
      project: t.projectId ? projectMap.get(t.projectId) : undefined,
      domain:
        t.domainId
          ? domainMap.get(t.domainId)
          : t.projectId && projectMap.get(t.projectId)?.domainId
            ? domainMap.get(projectMap.get(t.projectId)!.domainId!)
            : undefined,
    }));
  }, [data, statusFilter, effectiveProjectFilter, domainFilter, searchQuery, ctx]);

  const count = filteredTasks?.length ?? 0;
  const activeFilterCount = [effectiveProjectFilter, domainFilter, searchQuery.trim()].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-4">
      <QuickTaskEntry id="tasks-page-task-title" compact />

      <section aria-label="Task controls" className="surface flex flex-col gap-2.5 p-2.5 sm:p-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-input px-3 transition-colors focus-within:border-ring focus-within:shadow-[0_0_0_3px_color-mix(in_oklch,var(--ring)_18%,transparent)] sm:min-h-9 sm:max-w-sm">
            <label htmlFor="task-search" className="sr-only">Search tasks</label>
            <Search
              className="pointer-events-none size-3.5 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <input
              id="task-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search tasks"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-subtle-foreground"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear task search"
                title="Clear search"
                className="-mr-2 inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => openWorkLogger('task')}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground sm:min-h-9"
          >
            <Plus className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">New task</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Task status"
            className="grid w-full grid-cols-3 items-center gap-0.5 rounded-lg border bg-bg-sunken p-0.5 sm:w-auto"
          >
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={statusFilter === tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={cn(
                  'min-h-10 rounded-md px-3 py-1 text-[12px] font-medium transition-all sm:min-h-8',
                  statusFilter === tab.id
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Domain filter */}
          {data && data.activeDomains.length > 0 && (
            <FilterDropdown
              label="Domain"
              value={domainFilter}
              options={data.activeDomains
                .sort((a, b) => a.order - b.order)
                .map((d) => ({ id: d.id, name: d.name, color: d.color }))}
              onChange={setDomainFilter}
              placeholder="All domains"
            />
          )}

          {/* Project filter */}
          {data && data.activeProjects.length > 0 && (
            <FilterDropdown
              label="Project"
              value={effectiveProjectFilter}
              options={data.activeProjects
                .filter((p) => matchesOrgContext(p.orgId, ctx))
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((p) => ({ id: p.id, name: p.name, color: p.color }))}
              onChange={setProjectFilter}
              placeholder="All projects"
            />
          )}

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setProjectFilter(null);
                setDomainFilter(null);
                setSearchQuery('');
              }}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive sm:min-h-8"
            >
              <X className="size-3" aria-hidden />
              Clear {activeFilterCount}
            </button>
          )}

          <div className="ml-auto rounded-md border bg-card px-2 py-1 font-mono text-[11px] tabular-nums text-subtle-foreground">
            {filteredTasks === null ? '-' : `${count} task${count !== 1 ? 's' : ''}`}
          </div>
        </div>
      </section>

      {/* Task list */}
      {filteredTasks === null ? (
        <SkeletonRows />
      ) : filteredTasks.length === 0 ? (
        <EmptyState statusFilter={statusFilter} onCreate={() => openWorkLogger('task')} />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {filteredTasks.map(({ task, project, domain }) => (
            <TaskRow
              key={task.id}
              task={task}
              projectName={project?.name}
              projectColor={project?.color}
              domainName={domain?.name}
              domainColor={domain?.color}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
