'use client';

import { format } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowUpDown,
  CalendarClock,
  Check,
  Circle,
  CircleAlert,
  ListFilter,
  Search,
  X,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { getDb, matchesOrgContext, PERSONAL_COLOR } from '@ops-dashboard/core';
import type { Task } from '@ops-dashboard/core';
import { cn } from '@ops-dashboard/ui';
import { useAppStore } from '@/lib/app-store';
import { useHotkeys } from '@/lib/hotkeys';
import { taskLane } from '@/lib/org-lanes';
import { useOrgStore } from '@/lib/org-store';
import { isActiveProject } from '@/lib/project-query';
import { compareTasksBy, matchesTaskSearch, type TaskSort } from '@/lib/task-query';
import { setTaskStatus } from '@/lib/tasks';
import { taskDateLabel, taskResultSummary } from '@/lib/task-presentation';

type StatusFilter = 'open' | 'done';

const STATUS_TABS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'open', label: 'Open' },
  { id: 'done', label: 'Done' },
];

interface TaskRowProps {
  task: Task;
  projectName?: string;
  projectColor?: string;
  organizationName?: string;
  organizationColor?: string;
}

function TaskRow({
  task,
  projectName,
  projectColor,
  organizationName,
  organizationColor,
}: TaskRowProps) {
  const done = task.status === 'done';
  const openEdit = useAppStore((state) => state.openEdit);
  const dateValue = task.dueAt?.slice(0, 10) ?? task.scheduledFor;
  const today = format(new Date(), 'yyyy-MM-dd');
  const overdue = Boolean(!done && dateValue && dateValue < today);
  const dueToday = Boolean(!done && dateValue === today);
  const dateLabel = dateValue ? taskDateLabel(dateValue, today, done) : null;
  const dueChipClass = useMemo(() => {
    if (done) return 'text-muted-foreground';
    if (overdue) return 'font-medium text-destructive';
    if (dueToday) return 'font-medium text-warning';
    return 'text-muted-foreground';
  }, [done, dueToday, overdue]);

  return (
    <li
      className={cn(
        'group surface-flat hover:border-border-strong hover:bg-accent/20 flex items-start gap-2 px-3 py-2.5 transition-colors sm:px-4',
        done && 'opacity-60',
      )}
    >
      <button
        type="button"
        onClick={() => void setTaskStatus(task.id, done ? 'todo' : 'done')}
        className={cn(
          'relative -ml-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors sm:size-10',
          done ? 'text-primary' : 'text-muted-foreground hover:bg-primary/10 hover:text-primary',
        )}
        aria-label={done ? `Restore ${task.title}` : `Complete ${task.title}`}
      >
        <span
          className={cn(
            'inline-flex size-[18px] items-center justify-center rounded-full border',
            done ? 'border-primary bg-primary text-primary-foreground' : 'border-current',
          )}
          aria-hidden
        >
          {done ? <Check className="size-3" strokeWidth={3} /> : null}
        </span>
      </button>

      <button
        type="button"
        onClick={() => openEdit(task.id)}
        aria-label={`Open ${task.title}`}
        className="min-w-0 flex-1 py-1 text-left"
      >
        <div className="flex min-w-0 items-start gap-2">
          <span
            className={cn(
              'line-clamp-2 min-w-0 flex-1 text-sm leading-5',
              done && 'text-muted-foreground decoration-muted-foreground/50 line-through',
            )}
          >
            {task.title}
          </span>
          {task.priority >= 2 ? (
            <span
              className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
                task.priority === 3
                  ? 'bg-destructive/12 text-destructive'
                  : 'bg-warning/12 text-warning',
              )}
            >
              {task.priority === 3 ? 'Critical' : 'Important'}
            </span>
          ) : null}
        </div>

        <div className="text-subtle-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
          {dateLabel ? (
            <span className={cn('inline-flex items-center gap-1', dueChipClass)}>
              {overdue ? (
                <CircleAlert className="size-3" aria-hidden />
              ) : (
                <CalendarClock className="size-3" aria-hidden />
              )}
              {dateLabel}
            </span>
          ) : null}
          {projectName ? (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ background: projectColor }}
                aria-hidden
              />
              <span className="max-w-44 truncate">{projectName}</span>
            </span>
          ) : null}
          {organizationName ? (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ background: organizationColor ?? PERSONAL_COLOR }}
                aria-hidden
              />
              <span className="max-w-36 truncate">{organizationName}</span>
            </span>
          ) : null}
        </div>
      </button>
      {done ? (
        <span
          aria-hidden
          className="text-primary self-center text-[11px] font-medium opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
        >
          Restore
        </span>
      ) : null}
    </li>
  );
}

function EmptyState({
  statusFilter,
  onAdd,
  onViewOpen,
}: {
  statusFilter: StatusFilter;
  onAdd: () => void;
  onViewOpen: () => void;
}) {
  const done = statusFilter === 'done';
  return (
    <div className="surface flex min-h-48 flex-col items-center justify-center gap-2 p-6 text-center">
      <span className="bg-bg-sunken text-muted-foreground flex size-10 items-center justify-center rounded-full">
        {done ? (
          <Check className="size-5" aria-hidden />
        ) : (
          <Circle className="size-5" aria-hidden />
        )}
      </span>
      <h3 className="text-base font-semibold">
        {done ? 'No completed tasks yet.' : 'No open tasks.'}
      </h3>
      <p className="text-muted-foreground max-w-md text-sm">
        {done
          ? 'Completed tasks will appear here.'
          : 'Use Add below on mobile, or the task bar above on desktop.'}
      </p>
      <button
        type="button"
        onClick={done ? onViewOpen : onAdd}
        className="bg-primary text-primary-foreground mt-2 inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold"
      >
        {done ? 'View open tasks' : 'Add task'}
      </button>
    </div>
  );
}

function SkeletonRows() {
  return (
    <ul className="flex flex-col gap-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <li
          key={index}
          aria-hidden
          className="surface-flat h-16 animate-pulse"
          style={{ animationDelay: `${index * 60}ms` }}
        />
      ))}
    </ul>
  );
}

export function TasksView() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [projectFilter, setProjectFilter] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState<TaskSort>('default');
  const searchRef = useRef<HTMLInputElement>(null);
  const ctx = useOrgStore((state) => state.ctx);
  const openWorkLogger = useAppStore((state) => state.openWorkLogger);
  useHotkeys([{ combo: '/', handler: () => searchRef.current?.focus() }]);

  const data = useLiveQuery(async () => {
    const db = getDb();
    const [allTasks, allProjects, allDomains, allOrganizations] = await Promise.all([
      db.tasks.toArray(),
      db.projects.toArray(),
      db.domains.toArray(),
      db.organizations.toArray(),
    ]);
    const activeProjects = allProjects.filter(isActiveProject);
    const activeDomains = allDomains
      .filter((domain) => !domain.deletedAt)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    const activeOrganizations = allOrganizations.filter(
      (organization) => !organization.deletedAt && !organization.archivedAt,
    );
    return {
      allTasks,
      activeProjects,
      activeDomains,
      projectMap: new Map(activeProjects.map((project) => [project.id, project])),
      organizationMap: new Map(
        activeOrganizations.map((organization) => [organization.id, organization]),
      ),
    };
  });

  const visibleProjectFilter =
    projectFilter &&
    data?.activeProjects.some(
      (project) => project.id === projectFilter && matchesOrgContext(project.orgId, ctx),
    )
      ? projectFilter
      : '';

  const filteredTasks = useMemo(() => {
    if (!data) return null;
    const { allTasks, projectMap, organizationMap } = data;
    let tasks = allTasks.filter((task) => !task.deletedAt && task.status !== 'archived');

    tasks = tasks.filter((task) => matchesOrgContext(taskLane(task, projectMap), ctx));
    tasks = tasks.filter((task) =>
      statusFilter === 'open' ? task.status !== 'done' : task.status === 'done',
    );

    if (visibleProjectFilter) {
      tasks = tasks.filter((task) => task.projectId === visibleProjectFilter);
    }
    if (domainFilter) {
      tasks = tasks.filter((task) => {
        if (task.domainId === domainFilter) return true;
        return Boolean(task.projectId && projectMap.get(task.projectId)?.domainId === domainFilter);
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

    return tasks
      .sort((a, b) => compareTasksBy(sort, a, b))
      .map((task) => {
        const project = task.projectId ? projectMap.get(task.projectId) : undefined;
        const laneId = taskLane(task, projectMap);
        return {
          task,
          project,
          organization: laneId ? organizationMap.get(laneId) : undefined,
        };
      });
  }, [ctx, data, domainFilter, searchQuery, sort, statusFilter, visibleProjectFilter]);

  const activeFilterCount =
    Number(Boolean(visibleProjectFilter)) +
    Number(Boolean(domainFilter)) +
    Number(Boolean(searchQuery.trim()));
  const hasActiveFilters = activeFilterCount > 0;
  const activeProjectName = data?.activeProjects.find(
    (project) => project.id === visibleProjectFilter,
  )?.name;
  const activeDomainName = data?.activeDomains.find((domain) => domain.id === domainFilter)?.name;
  const count = filteredTasks?.length ?? 0;
  const overdueCount =
    filteredTasks?.filter(({ task }) => {
      const taskDate = task.dueAt?.slice(0, 10) ?? task.scheduledFor;
      return (
        task.status !== 'done' && Boolean(taskDate && taskDate < format(new Date(), 'yyyy-MM-dd'))
      );
    }).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Task controls" className="surface flex flex-col gap-2.5 p-2.5 sm:p-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="bg-input focus-within:border-ring flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border px-3 sm:max-w-lg">
            <label htmlFor="task-search" className="sr-only">
              Search tasks
            </label>
            <Search className="text-muted-foreground size-4 shrink-0" aria-hidden />
            <input
              ref={searchRef}
              id="task-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search tasks"
              className="placeholder:text-subtle-foreground min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
            {!searchQuery ? (
              <kbd className="bg-bg-sunken text-subtle-foreground hidden rounded border px-1.5 py-0.5 font-mono text-[10px] sm:inline">
                /
              </kbd>
            ) : null}
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  searchRef.current?.focus();
                }}
                aria-label="Clear task search"
                className="text-muted-foreground hover:text-foreground -mr-2 inline-flex size-9 items-center justify-center rounded-md"
              >
                <X className="size-4" aria-hidden />
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-label="Filters"
            aria-expanded={filtersOpen}
            aria-controls="task-filters"
            className={cn(
              'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors',
              filtersOpen || activeFilterCount > 0
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'bg-card text-muted-foreground hover:text-foreground',
            )}
          >
            <ListFilter className="size-4" aria-hidden />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 ? (
              <span className="bg-primary text-primary-foreground inline-flex min-w-5 items-center justify-center rounded-full text-[10px]">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <div
            role="group"
            aria-label="Task status"
            className="bg-bg-sunken grid grid-cols-2 gap-0.5 rounded-lg border p-0.5"
          >
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={statusFilter === tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={cn(
                  'min-h-10 rounded-md px-4 text-xs font-medium transition-colors sm:min-h-8',
                  statusFilter === tab.id
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <label className="bg-bg-sunken text-muted-foreground flex min-h-8 items-center gap-1.5 rounded-lg border px-2 text-[11px]">
              <ArrowUpDown className="size-3.5" aria-hidden />
              <span className="sr-only">Sort tasks</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as TaskSort)}
                className="bg-transparent outline-none"
                aria-label="Sort tasks"
              >
                <option value="default">Default</option>
                <option value="due">Due date</option>
                <option value="priority">Priority</option>
                <option value="recent">Recently updated</option>
              </select>
            </label>
            {overdueCount > 0 ? (
              <span className="bg-destructive/10 text-destructive rounded-full px-2.5 py-1 text-[11px] font-medium">
                {overdueCount} overdue
              </span>
            ) : null}
            <span className="bg-bg-sunken text-muted-foreground rounded-full px-2.5 py-1 text-[11px] tabular-nums">
              {filteredTasks === null ? '-' : taskResultSummary(count, hasActiveFilters)}
            </span>
          </div>
        </div>

        {hasActiveFilters ? (
          <div role="group" aria-label="Active filters" className="flex flex-wrap gap-1.5">
            {searchQuery.trim() ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  searchRef.current?.focus();
                }}
                aria-label={`Remove search filter ${searchQuery.trim()}`}
                className="bg-primary/10 text-primary hover:bg-primary/15 inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full px-3 text-xs font-medium"
              >
                <span className="max-w-48 truncate">Search: {searchQuery.trim()}</span>
                <X className="size-3.5 shrink-0" aria-hidden />
              </button>
            ) : null}
            {activeProjectName ? (
              <button
                type="button"
                onClick={() => setProjectFilter('')}
                aria-label={`Remove project filter ${activeProjectName}`}
                className="bg-bg-sunken text-muted-foreground hover:text-foreground inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full border px-3 text-xs font-medium"
              >
                <span className="max-w-48 truncate">Project: {activeProjectName}</span>
                <X className="size-3.5 shrink-0" aria-hidden />
              </button>
            ) : null}
            {activeDomainName ? (
              <button
                type="button"
                onClick={() => setDomainFilter('')}
                aria-label={`Remove domain filter ${activeDomainName}`}
                className="bg-bg-sunken text-muted-foreground hover:text-foreground inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full border px-3 text-xs font-medium"
              >
                <span className="max-w-48 truncate">Domain: {activeDomainName}</span>
                <X className="size-3.5 shrink-0" aria-hidden />
              </button>
            ) : null}
          </div>
        ) : null}

        {filtersOpen ? (
          <div
            id="task-filters"
            className="grid gap-2 border-t pt-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
          >
            <label className="text-muted-foreground flex flex-col gap-1.5 text-xs font-medium">
              Project
              <select
                value={visibleProjectFilter}
                onChange={(event) => setProjectFilter(event.target.value)}
                className="input min-h-11"
              >
                <option value="">All projects</option>
                {(data?.activeProjects ?? [])
                  .filter((project) => matchesOrgContext(project.orgId, ctx))
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
              </select>
            </label>
            <label className="text-muted-foreground flex flex-col gap-1.5 text-xs font-medium">
              Domain
              <select
                value={domainFilter}
                onChange={(event) => setDomainFilter(event.target.value)}
                className="input min-h-11"
              >
                <option value="">All domains</option>
                {(data?.activeDomains ?? []).map((domain) => (
                  <option key={domain.id} value={domain.id}>
                    {domain.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                setProjectFilter('');
                setDomainFilter('');
                setSearchQuery('');
              }}
              disabled={!hasActiveFilters}
              className="text-muted-foreground hover:bg-accent hover:text-foreground min-h-11 self-end rounded-lg px-3 text-xs font-medium disabled:opacity-40"
            >
              Clear filters
            </button>
          </div>
        ) : null}
      </section>

      {filteredTasks === null ? (
        <SkeletonRows />
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          statusFilter={statusFilter}
          onAdd={() => openWorkLogger('task')}
          onViewOpen={() => setStatusFilter('open')}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {filteredTasks.map(({ task, project, organization }) => (
            <TaskRow
              key={task.id}
              task={task}
              projectName={project?.name}
              projectColor={project?.color}
              organizationName={ctx === 'all' ? (organization?.name ?? 'Personal') : undefined}
              organizationColor={
                ctx === 'all' ? (organization?.color ?? PERSONAL_COLOR) : undefined
              }
            />
          ))}
        </ul>
      )}
    </div>
  );
}
