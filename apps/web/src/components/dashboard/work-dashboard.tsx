'use client';

import { format, isValid, parseISO } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, Plus } from 'lucide-react';
import { getDb, PERSONAL_COLOR } from '@ops-dashboard/core';
import type { Organization, Project, Task } from '@ops-dashboard/core';
import { cn } from '@ops-dashboard/ui';
import { useAppStore } from '@/lib/app-store';
import { buildWorkDashboard } from '@/lib/work-dashboard';
import { useOrgStore } from '@/lib/org-store';
import { setTaskStatus } from '@/lib/tasks';
import { ViewShell } from '@/components/view-shell';

export function WorkDashboard() {
  const ctx = useOrgStore((state) => state.ctx);
  const openEdit = useAppStore((state) => state.openEdit);
  const openWorkLogger = useAppStore((state) => state.openWorkLogger);
  const today = format(new Date(), 'yyyy-MM-dd');
  const data = useLiveQuery(async () => {
    const db = getDb();
    const [tasks, projects, organizations] = await Promise.all([
      db.tasks.toArray(),
      db.projects.toArray(),
      db.organizations.toArray(),
    ]);
    return {
      projects,
      organizations: organizations.filter(
        (organization) => !organization.deletedAt && !organization.archivedAt,
      ),
      model: buildWorkDashboard(tasks, projects, ctx, today),
    };
  }, [ctx, today]);

  const contextLabel =
    ctx === 'all'
      ? 'All work'
      : ctx === 'personal'
        ? 'Personal'
        : (data?.organizations.find((organization) => organization.id === ctx)?.name ??
          'Workspace');

  return (
    <ViewShell
      eyebrow={contextLabel}
      title="Today"
      subtitle={format(new Date(), 'EEEE, MMMM d')}
      compactHeader
      fullWidth
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        {!data ? (
          <AgendaSkeleton />
        ) : (
          <>
            {data.model.overdue.length > 0 ? (
              <AgendaSection
                title="Overdue"
                tasks={data.model.overdue}
                projects={data.projects}
                organizations={data.organizations}
                today={today}
                showOrganization={ctx === 'all'}
                onOpen={openEdit}
                tone="danger"
              />
            ) : null}

            <AgendaSection
              title="Today"
              tasks={data.model.today}
              projects={data.projects}
              organizations={data.organizations}
              today={today}
              showOrganization={ctx === 'all'}
              onOpen={openEdit}
              emptyAction={() => openWorkLogger('task')}
            />

            {data.model.upcoming.length > 0 ? (
              <AgendaSection
                title="Upcoming"
                tasks={data.model.upcoming}
                projects={data.projects}
                organizations={data.organizations}
                today={today}
                showOrganization={ctx === 'all'}
                onOpen={openEdit}
              />
            ) : null}
          </>
        )}
      </div>
    </ViewShell>
  );
}

function AgendaSection({
  title,
  tasks,
  projects,
  organizations,
  today,
  showOrganization,
  onOpen,
  emptyAction,
  tone = 'default',
}: {
  title: string;
  tasks: Task[];
  projects: Project[];
  organizations: Organization[];
  today: string;
  showOrganization: boolean;
  onOpen: (id: string) => void;
  emptyAction?: () => void;
  tone?: 'default' | 'danger';
}) {
  return (
    <section className="surface overflow-hidden" aria-labelledby={`agenda-${title.toLowerCase()}`}>
      <header className="hairline flex items-center gap-2 border-b px-4 py-3">
        <h2
          id={`agenda-${title.toLowerCase()}`}
          className={cn('text-sm font-semibold', tone === 'danger' && 'text-destructive')}
        >
          {title}
        </h2>
        <span className="bg-bg-sunken text-muted-foreground rounded-full px-2 py-0.5 text-xs tabular-nums">
          {tasks.length}
        </span>
      </header>

      {tasks.length > 0 ? (
        <ul className="divide-border/70 divide-y">
          {tasks.map((task) => (
            <AgendaTaskRow
              key={task.id}
              task={task}
              project={projects.find((project) => project.id === task.projectId)}
              organization={organizations.find((organization) => organization.id === task.orgId)}
              today={today}
              showOrganization={showOrganization}
              onOpen={() => onOpen(task.id)}
            />
          ))}
        </ul>
      ) : (
        <div className="flex min-h-48 flex-col items-center justify-center gap-3 px-5 text-center">
          <span className="bg-success/10 text-success flex size-10 items-center justify-center rounded-full">
            <Check className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-medium">Nothing due today.</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Add the next thing you want to finish.
            </p>
          </div>
          {emptyAction ? (
            <button
              type="button"
              onClick={emptyAction}
              className="bg-primary text-primary-foreground inline-flex min-h-11 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold"
            >
              <Plus className="size-4" aria-hidden />
              Add task
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}

function AgendaTaskRow({
  task,
  project,
  organization,
  today,
  showOrganization,
  onOpen,
}: {
  task: Task;
  project?: Project;
  organization?: Organization;
  today: string;
  showOrganization: boolean;
  onOpen: () => void;
}) {
  const date = task.scheduledFor ?? task.dueAt?.slice(0, 10) ?? task.startAt?.slice(0, 10);
  const parsedDate = date ? parseISO(date) : null;
  const dateLabel =
    date === today
      ? 'Today'
      : parsedDate && isValid(parsedDate)
        ? format(parsedDate, 'MMM d')
        : date;
  const overdue = Boolean(date && date < today);

  return (
    <li className="group hover:bg-accent/35 flex min-w-0 items-start gap-2 px-3 py-2.5 transition-colors sm:px-4">
      <button
        type="button"
        onClick={() => void setTaskStatus(task.id, 'done')}
        aria-label={`Complete ${task.title}`}
        className="text-muted-foreground hover:bg-success/10 hover:text-success relative inline-flex size-10 shrink-0 items-center justify-center rounded-full transition-colors"
      >
        <span className="size-[18px] rounded-full border border-current" aria-hidden />
        <Check
          className="absolute size-3 opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden
        />
      </button>

      <button type="button" onClick={onOpen} className="min-w-0 flex-1 py-1 text-left">
        <span className="line-clamp-2 text-sm leading-5 font-medium">{task.title}</span>
        <span className="text-subtle-foreground mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
          {dateLabel ? (
            <span className={cn('font-medium', overdue && 'text-destructive')}>
              {overdue ? `Overdue ${dateLabel}` : dateLabel}
            </span>
          ) : null}
          {project ? (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ background: project.color }}
                aria-hidden
              />
              <span className="max-w-44 truncate">{project.name}</span>
            </span>
          ) : null}
          {showOrganization ? (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ background: organization?.color ?? PERSONAL_COLOR }}
                aria-hidden
              />
              <span className="max-w-36 truncate">{organization?.name ?? 'Personal'}</span>
            </span>
          ) : null}
        </span>
      </button>

      {task.priority >= 2 ? (
        <span
          className={cn(
            'mt-3 size-2 shrink-0 rounded-full',
            task.priority === 3 ? 'bg-destructive' : 'bg-warning',
          )}
          title={task.priority === 3 ? 'Critical priority' : 'Important priority'}
          aria-label={task.priority === 3 ? 'Critical priority' : 'Important priority'}
        />
      ) : null}
    </li>
  );
}

function AgendaSkeleton() {
  return (
    <div className="surface h-72 animate-pulse p-4" aria-label="Loading Today">
      <div className="bg-bg-sunken h-4 w-24 rounded" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-bg-sunken h-12 rounded" aria-hidden />
        ))}
      </div>
    </div>
  );
}
