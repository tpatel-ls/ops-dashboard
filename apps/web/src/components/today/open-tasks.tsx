'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { Check, ChevronDown, ChevronRight, Star } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';
import { getDb } from '@ops-dashboard/core';
import type { Priority } from '@ops-dashboard/core';
import { setTaskStatus, updateTask } from '@/lib/tasks';
import { todayISO } from '@/lib/routines';
import { useAppStore } from '@/lib/app-store';
import { cn } from '@ops-dashboard/ui';
import {
  compareTasksByCommitment,
  summarizeOpenTasks,
  taskCommitmentDay,
  taskIsOverdue,
} from '@/lib/task-dates';

const PRIORITY_COLOR: Record<Priority, string> = {
  0: 'transparent',
  1: 'var(--color-priority-low)',
  2: 'var(--color-priority-med)',
  3: 'var(--color-priority-urgent)',
};

const PRIORITY_LABEL: Record<Priority, string> = {
  0: '',
  1: 'P1',
  2: 'P2',
  3: 'P3',
};

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
      .filter((t) => !t.deletedAt && t.status !== 'done' && t.status !== 'archived')
      .sort(compareTasksByCommitment);
    return {
      tasks,
      projects: Object.fromEntries(allProjects.filter((p) => !p.deletedAt).map((p) => [p.id, p])),
      domains: Object.fromEntries(allDomains.filter((d) => !d.deletedAt).map((d) => [d.id, d])),
    };
  }) ?? { tasks: undefined, projects: {}, domains: {} };

  const openEdit = useAppStore((s) => s.openEdit);
  const summary = tasks === undefined ? null : summarizeOpenTasks(tasks, today);

  return (
    <section>
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
        className="hover:bg-accent/55 mb-2.5 flex min-h-10 w-full items-center gap-2 rounded-md px-2 text-left transition-colors"
      >
        <span className="text-subtle-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
          Open Tasks
        </span>
        {tasks !== undefined && (
          <span className="text-muted-foreground font-mono text-[10px] tabular-nums">
            ({tasks.length})
          </span>
        )}
        <span className="text-subtle-foreground ml-auto">
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
                <li
                  key={i}
                  className="surface-flat h-12 animate-pulse"
                  style={{ animationDelay: `${i * 80}ms` }}
                />
              ))}
            </ul>
          ) : tasks.length === 0 ? (
            <div className="os-panel flex min-h-[118px] flex-col items-center justify-center gap-2 rounded-lg p-6 text-center">
              <span className="text-subtle-foreground relative font-mono text-[10px] tracking-[0.22em] uppercase">
                open tasks
              </span>
              <h3 className="text-base font-semibold tracking-tight">A clean slate.</h3>
              <p className="text-muted-foreground max-w-sm text-sm leading-6">
                All caught up! Use the quick-add bar to capture what&apos;s next.
              </p>
            </div>
          ) : (
            <>
              {summary ? (
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <SummaryChip label="overdue" value={summary.overdue} tone="danger" />
                  <SummaryChip label="today" value={summary.today} tone="primary" />
                  <SummaryChip label="high" value={summary.high} tone="warn" />
                </div>
              ) : null}
              <ul className="flex flex-col gap-1.5">
                {tasks.map((task) => {
                  const priorityColor = PRIORITY_COLOR[task.priority];
                  const project = task.projectId ? projects[task.projectId] : null;
                  const domain = task.domainId
                    ? domains[task.domainId]
                    : project?.domainId
                      ? domains[project.domainId]
                      : null;
                  const commitmentDay = taskCommitmentDay(task);
                  const isOverdue = taskIsOverdue(task, today);

                  return (
                    <li
                      key={task.id}
                      className={cn(
                        'surface-flat group relative flex items-center gap-2 px-3 py-2 transition-all sm:gap-3 sm:px-4',
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
                        className="border-border-strong hover:border-primary hover:bg-primary/10 hover:text-primary inline-flex size-9 shrink-0 items-center justify-center rounded-full border text-transparent transition-all"
                        aria-label={`Complete ${task.title}`}
                      >
                        <Check className="size-3" strokeWidth={3} aria-hidden />
                      </button>

                      {/* title + meta */}
                      <button
                        type="button"
                        onClick={() => openEdit(task.id)}
                        className="min-w-0 flex-1 py-1 text-left"
                      >
                        <div className="flex items-baseline gap-2">
                          <span className="truncate text-[13px] leading-5">{task.title}</span>
                          {task.priority > 0 && (
                            <span
                              className="rounded border px-1 py-0.5 font-mono text-[9px] leading-none font-semibold"
                              style={{ borderColor: priorityColor, color: priorityColor }}
                              aria-label={`Priority ${task.priority}`}
                            >
                              {PRIORITY_LABEL[task.priority]}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          {/* due/scheduled chip */}
                          {commitmentDay && (
                            <span
                              className={cn(
                                'font-mono text-[10px]',
                                isOverdue ? 'text-destructive' : 'text-subtle-foreground',
                              )}
                            >
                              {format(parseISO(`${commitmentDay}T00:00:00`), 'EEE d MMM')}
                            </span>
                          )}
                          {/* project / domain chip */}
                          {(project || domain) && (
                            <span className="bg-bg-sunken text-muted-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px]">
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
                      </button>

                      {/* star to promote */}
                      <button
                        type="button"
                        onClick={() => updateTask(task.id, { starred: true })}
                        className={cn(
                          'text-muted-foreground inline-flex size-9 shrink-0 items-center justify-center rounded-md opacity-70 transition-all sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100',
                          'hover:text-primary',
                        )}
                        aria-label={`Add ${task.title} to daily mission`}
                      >
                        <Star className="size-4" aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  );
}

function SummaryChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'danger' | 'primary' | 'warn';
}) {
  return (
    <span
      className={cn(
        'bg-card text-muted-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-[0.1em] uppercase',
        value > 0 &&
          tone === 'danger' &&
          'border-destructive/35 bg-destructive/10 text-destructive',
        value > 0 && tone === 'primary' && 'border-primary/35 bg-primary/10 text-primary',
        value > 0 && tone === 'warn' && 'border-warning/40 bg-warning/10 text-warning',
      )}
    >
      <span className="tabular-nums">{value}</span>
      {label}
    </span>
  );
}
