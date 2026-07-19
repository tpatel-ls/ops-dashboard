'use client';

import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, isValid, parseISO } from 'date-fns';
import {
  ArrowRight,
  CalendarClock,
  Check,
  CircleAlert,
  FolderKanban,
  ListTodo,
  Plus,
} from 'lucide-react';
import { getDb, PERSONAL_COLOR } from '@ops-dashboard/core';
import type { Organization, Project, Task } from '@ops-dashboard/core';
import { cn } from '@ops-dashboard/ui';
import { QuickTaskEntry } from '@/components/quick-task-entry';
import { ViewShell } from '@/components/view-shell';
import { useAppStore } from '@/lib/app-store';
import { useOrgStore } from '@/lib/org-store';
import { setTaskStatus } from '@/lib/tasks';
import { buildWorkDashboard, type WorkProjectSummary } from '@/lib/work-dashboard';

const QUICK_TASK_ID = 'dashboard-task-title';

function focusQuickTask() {
  document.getElementById(QUICK_TASK_ID)?.focus();
}

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
      tasks,
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
        : data?.organizations.find((organization) => organization.id === ctx)?.name ?? 'Workspace';

  return (
    <ViewShell
      eyebrow={contextLabel}
      title="Today's work"
      subtitle={`${format(new Date(), 'EEEE, MMMM d')} / Focus on what is due, then move one project forward.`}
      meta={data ? <DashboardCounts model={data.model.counts} /> : null}
      actions={
        <button
          type="button"
          onClick={focusQuickTask}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground sm:min-h-9"
        >
          <Plus className="size-4" aria-hidden />
          Capture task
        </button>
      }
    >
      <div className="flex flex-col gap-5">
        <QuickTaskEntry id={QUICK_TASK_ID} defaultSchedule="today" />

        {!data ? (
          <DashboardSkeleton />
        ) : (
          <>
            <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
              <section className="surface min-w-0 overflow-hidden" aria-labelledby="attention-title">
                <SectionHeader
                  id="attention-title"
                  icon={CircleAlert}
                  title="Needs attention"
                  detail={`${data.model.counts.overdue} overdue / ${data.model.counts.today} today`}
                />
                <TaskSection
                  tasks={[...data.model.overdue, ...data.model.today]}
                  projects={data.projects}
                  organizations={data.organizations}
                  today={today}
                  empty="Nothing overdue or due today."
                  onOpen={openEdit}
                  onAdd={focusQuickTask}
                />
              </section>

              <section className="surface min-w-0 overflow-hidden" aria-labelledby="upcoming-title">
                <SectionHeader
                  id="upcoming-title"
                  icon={CalendarClock}
                  title="Next up"
                  detail={`${data.model.upcoming.length} scheduled`}
                  href="/calendar"
                />
                <TaskSection
                  tasks={data.model.upcoming}
                  projects={data.projects}
                  organizations={data.organizations}
                  today={today}
                  empty="No upcoming tasks scheduled."
                  onOpen={openEdit}
                  onAdd={focusQuickTask}
                />
              </section>
            </div>

            <section aria-labelledby="active-projects-title" className="min-w-0">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="eyebrow">Execution</p>
                  <h2 id="active-projects-title" className="mt-1 text-lg font-semibold">
                    Active projects
                  </h2>
                </div>
                <Link href="/projects" className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground hover:text-foreground sm:min-h-9">
                  View all projects
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </div>
              {data.model.projects.length > 0 ? (
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {data.model.projects.map((summary) => (
                    <ProjectSummary
                      key={summary.project.id}
                      summary={summary}
                      organization={data.organizations.find(
                        (organization) => organization.id === summary.project.orgId,
                      )}
                      onAddTask={() => openWorkLogger('task', summary.project.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="surface flex min-h-44 flex-col items-center justify-center gap-3 px-4 text-center">
                  <FolderKanban className="size-5 text-muted-foreground" aria-hidden />
                  <div>
                    <p className="text-sm font-medium">No active projects in this workspace.</p>
                    <p className="mt-1 text-xs text-muted-foreground">Create a project when work needs a shared outcome.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openWorkLogger('project')}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground"
                  >
                    <Plus className="size-3.5" aria-hidden />
                    Create project
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </ViewShell>
  );
}

function DashboardCounts({
  model,
}: {
  model: { overdue: number; today: number; activeProjects: number };
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5" aria-label="Work summary">
      <CountSignal label="Overdue" value={model.overdue} danger={model.overdue > 0} />
      <CountSignal label="Today" value={model.today} active={model.today > 0} />
      <CountSignal label="Projects" value={model.activeProjects} />
    </div>
  );
}

function CountSignal({
  label,
  value,
  danger = false,
  active = false,
}: {
  label: string;
  value: number;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex min-w-16 items-center justify-center gap-1.5 rounded-md border bg-card/75 px-2 py-1.5 text-[11px] text-muted-foreground',
        danger && 'border-destructive/35 bg-destructive/5 text-destructive',
        active && !danger && 'border-primary/30 bg-primary/5',
      )}
    >
      <strong className="font-mono text-xs tabular-nums text-foreground">{value}</strong>
      <span className="truncate">{label}</span>
    </span>
  );
}

function SectionHeader({
  id,
  icon: Icon,
  title,
  detail,
  href,
}: {
  id: string;
  icon: typeof ListTodo;
  title: string;
  detail: string;
  href?: string;
}) {
  return (
    <header className="hairline flex items-center gap-3 border-b px-4 py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h2 id={id} className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      {href ? (
        <Link href={href} aria-label={`Open ${title}`} className="inline-flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      ) : null}
    </header>
  );
}

function TaskSection({
  tasks,
  projects,
  organizations,
  today,
  empty,
  onOpen,
  onAdd,
}: {
  tasks: Task[];
  projects: Project[];
  organizations: Organization[];
  today: string;
  empty: string;
  onOpen: (id: string) => void;
  onAdd: () => void;
}) {
  if (tasks.length === 0) {
    return (
      <div className="flex min-h-52 flex-col items-center justify-center gap-3 px-4 text-center">
        <Check className="size-5 text-success" aria-hidden />
        <p className="text-sm text-muted-foreground">{empty}</p>
        <button type="button" onClick={onAdd} className="min-h-11 rounded-md px-3 text-xs font-medium text-primary hover:bg-primary/10">
          Add a task
        </button>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border/70">
      {tasks.map((task) => (
        <DashboardTaskRow
          key={task.id}
          task={task}
          project={projects.find((project) => project.id === task.projectId)}
          organization={organizations.find((organization) => organization.id === task.orgId)}
          today={today}
          onOpen={() => onOpen(task.id)}
        />
      ))}
    </ul>
  );
}

function DashboardTaskRow({
  task,
  project,
  organization,
  today,
  onOpen,
}: {
  task: Task;
  project?: Project;
  organization?: Organization;
  today: string;
  onOpen: () => void;
}) {
  const date = task.scheduledFor ?? task.dueAt?.slice(0, 10) ?? task.startAt?.slice(0, 10);
  const overdue = Boolean(date && date < today);
  return (
    <li className="group flex min-w-0 items-center gap-2.5 px-3 py-2.5 sm:px-4">
      <button
        type="button"
        onClick={() => void setTaskStatus(task.id, 'done')}
        aria-label={`Complete ${task.title}`}
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-success/10 hover:text-success"
      >
        <span className="size-4 rounded-full border border-current" aria-hidden />
      </button>
      <button type="button" onClick={onOpen} className="min-w-0 flex-1 py-1 text-left">
        <span className="block truncate text-sm font-medium">{task.title}</span>
        <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-subtle-foreground">
          {project ? <span className="truncate">{project.name}</span> : null}
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full" style={{ background: organization?.color ?? PERSONAL_COLOR }} aria-hidden />
            {organization?.name ?? 'Personal'}
          </span>
          {date ? <span className={cn(overdue && 'text-destructive')}>{date === today ? 'Today' : date}</span> : null}
        </span>
      </button>
      {task.priority >= 2 ? (
        <span className={cn('size-2 shrink-0 rounded-full', task.priority === 3 ? 'bg-destructive' : 'bg-warning')} title={task.priority === 3 ? 'Critical' : 'Important'} />
      ) : null}
    </li>
  );
}

function ProjectSummary({
  summary,
  organization,
  onAddTask,
}: {
  summary: WorkProjectSummary;
  organization?: Organization;
  onAddTask: () => void;
}) {
  const { project, openTasks, completedTasks, completionPct } = summary;
  const parsedDue = project.dueDate ? parseISO(project.dueDate) : null;
  const dueLabel = parsedDue && isValid(parsedDue) ? format(parsedDue, 'MMM d') : null;
  return (
    <article className="surface-flat flex min-w-0 flex-col p-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-1 size-3 shrink-0 rounded-full" style={{ background: project.color }} aria-hidden />
        <div className="min-w-0 flex-1">
          <Link href="/projects" className="block truncate text-sm font-semibold hover:text-primary">{project.name}</Link>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-subtle-foreground">
            <span>{organization?.name ?? 'Personal'}</span>
            {dueLabel ? <span>Due {dueLabel}</span> : null}
          </p>
        </div>
        <button
          type="button"
          onClick={onAddTask}
          aria-label={`Add task to ${project.name}`}
          title="Add task"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </div>
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] text-subtle-foreground">
          <span>{openTasks} open / {completedTasks} done</span>
          <span className="font-mono tabular-nums">{completionPct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-bg-sunken">
          <div className="h-full rounded-full bg-primary" style={{ width: `${completionPct}%` }} />
        </div>
      </div>
    </article>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-5 xl:grid-cols-2" aria-label="Loading work dashboard">
      {[0, 1].map((item) => (
        <div key={item} className="surface h-72 animate-pulse p-4" aria-hidden>
          <div className="h-4 w-32 rounded bg-bg-sunken" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-11 rounded bg-bg-sunken" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
