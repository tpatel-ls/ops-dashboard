'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { Check, ChevronDown, ChevronRight, Star } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import { getDb } from '@drift/core';
import type { Task, Priority } from '@drift/core';
import { setTaskStatus, updateTask } from '@/lib/tasks';
import { todayISO } from '@/lib/routines';
import { useAppStore } from '@/lib/app-store';
import { cn } from '@drift/ui';

const PRIORITY_COLOR: Record<Priority, string> = {
  0: 'transparent',
  1: 'var(--color-priority-low)',
  2: 'var(--color-priority-med)',
  3: 'var(--color-priority-urgent)',
};

const PRIORITY_LABEL: Record<Priority, string> = {
  0: '',
  1: '!',
  2: '!!',
  3: '!!!',
};

function sortKey(t: Task): string {
  const date = t.scheduledFor ?? (t.dueAt ? t.dueAt.slice(0, 10) : null);
  const dateStr = date ?? '9999-99-99';
  const pri = String(9 - t.priority); // higher priority first → lower sort string
  return `${dateStr}__${pri}`;
}

export function OpenTasks() {
  const [collapsed, setCollapsed] = useState(false);
  const today = todayISO();

  const { tasks, projects, domains } = useLiveQuery(async () => {
    const db = getDb();
    const [allTasks, allProjects, allDomains] = await Promise.all([
      db.tasks.toArray(),
      db.projects.toArray(),
      db.domains.toArray(),
    ]);
    const tasks = allTasks
      .filter(
        (t) =>
          !t.deletedAt &&
          t.status !== 'done' &&
          t.status !== 'archived',
      )
      .sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
    return {
      tasks,
      projects: Object.fromEntries(allProjects.filter((p) => !p.deletedAt).map((p) => [p.id, p])),
      domains: Object.fromEntries(allDomains.filter((d) => !d.deletedAt).map((d) => [d.id, d])),
    };
  }) ?? { tasks: undefined, projects: {}, domains: {} };

  const openEdit = useAppStore((s) => s.openEdit);

  return (
    <section>
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="mb-2.5 flex w-full items-center gap-2 text-left"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
          Open Tasks
        </span>
        {tasks !== undefined && (
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
            ({tasks.length})
          </span>
        )}
        <span className="ml-auto text-subtle-foreground">
          {collapsed ? (
            <ChevronRight className="size-3.5" aria-hidden />
          ) : (
            <ChevronDown className="size-3.5" aria-hidden />
          )}
        </span>
      </button>

      {!collapsed && (
        <>
          {tasks === undefined ? (
            <ul className="flex flex-col gap-1.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="surface-flat h-12 animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
              ))}
            </ul>
          ) : tasks.length === 0 ? (
            <div className="surface flex min-h-[80px] flex-col items-center justify-center gap-1.5 p-6 text-center">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-subtle-foreground">
                open tasks
              </span>
              <h3 className="text-base font-semibold tracking-tight">A clean slate.</h3>
              <p className="text-sm text-muted-foreground">
                All caught up! Use the quick-add bar to capture what's next.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {tasks.map((task) => {
                const priorityColor = PRIORITY_COLOR[task.priority];
                const project = task.projectId ? projects[task.projectId] : null;
                const domain = task.domainId
                  ? domains[task.domainId]
                  : project?.domainId
                    ? domains[project.domainId]
                    : null;
                const isOverdue =
                  (task.scheduledFor && task.scheduledFor < today) ||
                  (task.dueAt && task.dueAt.slice(0, 10) < today);

                return (
                  <li
                    key={task.id}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('button')) return;
                      openEdit(task.id);
                    }}
                    className={cn(
                      'surface-flat group relative flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-all',
                      'hover:border-border-strong hover:shadow-[0_4px_18px_-12px_rgba(0,0,0,0.45)]',
                    )}
                  >
                    {/* priority accent */}
                    <span
                      aria-hidden
                      className="absolute inset-y-2 left-0 w-[3px] rounded-r-full"
                      style={{
                        background: priorityColor,
                        opacity: task.priority === 0 ? 0 : 1,
                      }}
                    />

                    {/* check */}
                    <button
                      type="button"
                      onClick={() => setTaskStatus(task.id, 'done')}
                      className="inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-border-strong text-transparent transition-all hover:border-primary hover:bg-primary/10"
                      aria-label="Mark done"
                    >
                      <Check className="size-3" strokeWidth={3} aria-hidden />
                    </button>

                    {/* title + meta */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="truncate text-[13px] leading-5">{task.title}</span>
                        {task.priority > 0 && (
                          <span
                            className="font-mono text-[10px] font-semibold leading-none"
                            style={{ color: priorityColor }}
                          >
                            {PRIORITY_LABEL[task.priority]}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        {/* due/scheduled chip */}
                        {(task.scheduledFor || task.dueAt) && (
                          <span
                            className={cn(
                              'font-mono text-[10px]',
                              isOverdue ? 'text-destructive' : 'text-subtle-foreground',
                            )}
                          >
                            {task.scheduledFor
                              ? format(parseISO(`${task.scheduledFor}T00:00:00`), 'EEE d MMM')
                              : format(parseISO(task.dueAt!), 'EEE d MMM')}
                          </span>
                        )}
                        {/* project / domain chip */}
                        {(project || domain) && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-bg-sunken px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                            {project?.color && (
                              <span
                                className="inline-block size-1.5 rounded-full"
                                style={{ background: project.color }}
                                aria-hidden
                              />
                            )}
                            {project?.name ?? domain?.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* star to promote */}
                    <button
                      type="button"
                      onClick={() => updateTask(task.id, { starred: true })}
                      className={cn(
                        'shrink-0 text-muted-foreground opacity-0 transition-all group-hover:opacity-100',
                        'hover:text-primary',
                      )}
                      aria-label="Star task"
                    >
                      <Star className="size-4" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
