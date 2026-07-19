'use client';

import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useTransition } from 'react';
import {
  Activity,
  ArrowRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Database,
  Gauge,
  Headphones,
  Link2,
  MessageSquareText,
  PhoneCall,
  Radar,
  Route,
  ShieldCheck,
  Sparkles,
  Upload,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { getDb } from '@ops-dashboard/core';
import type { Task, TaskStatus } from '@ops-dashboard/core';
import { cn } from '@ops-dashboard/ui';
import { ViewShell } from '@/components/view-shell';
import { syncLsgLaunchPlan } from '@/lib/lsg-work-setup';

const STATUS_TONE: Record<TaskStatus, string> = {
  backlog: 'bg-bg-sunken text-subtle-foreground border-border',
  todo: 'bg-primary/10 text-primary border-primary/30',
  doing: 'bg-warning/10 text-warning border-warning/40',
  blocked: 'bg-destructive/10 text-destructive border-destructive/35',
  done: 'bg-success/10 text-success border-success/35',
  archived: 'bg-bg-sunken text-subtle-foreground border-border',
};

const CAPABILITIES: Array<{
  title: string;
  detail: string;
  icon: LucideIcon;
  terms: string[];
}> = [
  {
    title: 'Phone-system plug-in',
    detail: 'Connect to RingCentral or NICE without replacing the customer stack.',
    icon: Link2,
    terms: ['ringcentral', 'nice', 'phone system', 'dialing interface'],
  },
  {
    title: 'Lead ordering',
    detail: 'CRM or CSV intake, answer propensity, buyer fit, and time-of-day sequencing.',
    icon: Route,
    terms: ['lead list', 'smart call ordering', 'scoring'],
  },
  {
    title: 'Parallel dialing',
    detail: 'Multiple calls per rep, live-answer detection, voicemail and dead-number filtering.',
    icon: PhoneCall,
    terms: ['parallel dialing', 'predictive'],
  },
  {
    title: 'Rep assist',
    detail: 'History, script, objection handling, transcription, and call context in one panel.',
    icon: Headphones,
    terms: ['rep assist', 'scripts', 'transcribe'],
  },
  {
    title: 'No-answer follow-up',
    detail: 'SMS fallback, Apple Messages for Business path, callback tasks, and sequence rules.',
    icon: MessageSquareText,
    terms: ['no-answers', 'follow-up', 'blue-text', 'apple messaging'],
  },
  {
    title: 'CRM write-back',
    detail: 'Outcomes, recordings, transcripts, notes, and next actions written automatically.',
    icon: Database,
    terms: ['crm', 'write-back'],
  },
  {
    title: 'Manager live dashboard',
    detail: 'Reached, talk time, conversions, rep performance, scripts, and callback backlog.',
    icon: Gauge,
    terms: ['manager live dashboard', 'dashboard'],
  },
  {
    title: 'Overflow agents',
    detail: 'LSG humans or AI voice agents catch after-hours and maxed-out capacity.',
    icon: Bot,
    terms: ['overflow', 'ai voice', 'handoff'],
  },
];

const VENDOR_RAILS: Array<{
  name: string;
  status: string;
  icon: LucideIcon;
  detail: string;
}> = [
  {
    name: 'RingCentral',
    status: 'Voice, call control, call logs, recordings, SMS',
    icon: PhoneCall,
    detail: 'Best first connector for click-to-call, active call control, call results, and call recording ingestion.',
  },
  {
    name: 'NICE CXone',
    status: 'Auth, agent sessions, realtime/reporting, digital engagement',
    icon: Headphones,
    detail: 'Enterprise connector path for teams already running CXone contact-center workflows.',
  },
  {
    name: 'Apple messaging',
    status: 'Approved business messaging path required',
    icon: MessageSquareText,
    detail: 'Blue texting should use Apple Messages for Business or an approved MSP, with SMS and callback fallback.',
  },
  {
    name: 'CRM write-back',
    status: 'Schema-first connector',
    icon: Database,
    detail: 'Normalize leads, attempts, recordings, transcripts, dispositions, notes, and next actions.',
  },
];

const SCRIPT_STEPS = [
  'Import leads',
  'Score and sequence',
  'Dial in parallel',
  'Connect live answers',
  'Assist the rep',
  'Follow up no-answers',
  'Write back to CRM',
  'Escalate overflow',
];

function isOpen(task: Task): boolean {
  return task.status !== 'done' && task.status !== 'archived';
}

function taskText(task: Task): string {
  return `${task.title} ${task.notes ?? ''} ${task.tags.join(' ')}`.toLowerCase();
}

function capabilityProgress(tasks: Task[], terms: string[]) {
  const matched = tasks.filter((task) => terms.some((term) => taskText(task).includes(term)));
  const done = matched.filter((task) => task.status === 'done').length;
  const pct = matched.length > 0 ? Math.round((done / matched.length) * 100) : 0;
  return { matched, pct };
}

function taskDate(task: Task): Date | null {
  if (task.startAt) return parseISO(task.startAt);
  if (task.scheduledFor) return parseISO(task.scheduledFor);
  if (task.dueAt) return parseISO(task.dueAt);
  return null;
}

function dateLabel(task: Task): string {
  const d = taskDate(task);
  if (!d) return 'Unscheduled';
  return format(d, task.startAt ? 'EEE, MMM d h:mm a' : 'EEE, MMM d');
}

export function PowerDialerCommandCenter() {
  const [syncing, startSync] = useTransition();

  const data = useLiveQuery(async () => {
    const db = getDb();
    const [projects, tasks] = await Promise.all([
      db.projects.toArray().then((all) => all.filter((p) => !p.deletedAt && !p.archivedAt)),
      db.tasks.toArray().then((all) => all.filter((t) => !t.deletedAt && t.status !== 'archived')),
    ]);
    const powerDialer = projects.find((p) => p.name.trim().toLowerCase() === 'power dialer');
    const blueText = projects.find((p) => p.name.trim().toLowerCase() === 'blue text');
    const projectIds = new Set([powerDialer?.id, blueText?.id].filter(Boolean));
    const launchTasks = tasks.filter((task) => task.projectId && projectIds.has(task.projectId));
    return { projects, powerDialer, blueText, launchTasks };
  });

  const summary = useMemo(() => {
    const tasks = data?.launchTasks ?? [];
    const open = tasks.filter(isOpen);
    const doing = tasks.filter((task) => task.status === 'doing').length;
    const done = tasks.filter((task) => task.status === 'done').length;
    const urgent = open.filter((task) => task.priority >= 3).length;
    const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
    const scheduled = tasks
      .map((task) => ({ task, date: taskDate(task) }))
      .filter((item): item is { task: Task; date: Date } => item.date !== null && isOpen(item.task))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 8);

    return { total: tasks.length, open: open.length, doing, done, urgent, pct, scheduled };
  }, [data]);

  function handleSync() {
    startSync(() => {
      void syncLsgLaunchPlan();
    });
  }

  return (
    <ViewShell
      eyebrow="LSG"
      title="Power Dialer"
      subtitle="Blue text, phone-system integration, rep assist, follow-up, CRM write-back, and manager controls in one launch surface."
      fullWidth
      compactHeader
      actions={
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="hairline inline-flex min-h-11 items-center gap-2 rounded-lg border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-60 sm:min-h-9"
        >
          <Sparkles className="size-3.5 text-primary" aria-hidden />
          {syncing ? 'Syncing' : 'Sync launch plan'}
        </button>
      }
    >
      <div className="grid min-w-0 gap-5">
        <section className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="surface flex min-w-0 flex-col gap-4 p-4 md:p-5">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-md border bg-card px-2.5 py-1 text-xs text-muted-foreground">
                  <Radar className="size-3.5 text-primary" aria-hidden />
                  Launch command
                </span>
                <span className="inline-flex items-center gap-2 rounded-md border bg-card px-2.5 py-1 text-xs text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-success live-dot" aria-hidden />
                  {data?.powerDialer ? 'Power Dialer tracked' : 'Ready to create project'}
                </span>
              </div>
              <div>
                <h2 className="text-lg font-semibold">Launch overview</h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                  Track integration, dialing, rep assist, follow-up, CRM write-back, and manager controls.
                </p>
              </div>
              <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <HeroMetric label="Launch tasks" value={summary.total} icon={ClipboardList} />
                <HeroMetric label="Open" value={summary.open} icon={Activity} />
                <HeroMetric label="In progress" value={summary.doing} icon={Workflow} />
                <HeroMetric label="Urgent" value={summary.urgent} icon={ShieldCheck} tone="danger" />
              </div>
            </div>

            <div className="surface min-w-0 p-4 md:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold tracking-tight">Launch progress</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Blue Text plus Power Dialer tasks.</p>
                </div>
                <span className="font-mono text-3xl font-semibold tabular-nums">
                  {summary.pct}
                  <span className="ml-1 text-xs text-muted-foreground">%</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-bg-sunken">
                <div
                  className="h-full rounded-full bg-success transition-all"
                  style={{ width: `${summary.pct}%` }}
                />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <MiniMetric label="Done" value={summary.done} />
                <MiniMetric label="Doing" value={summary.doing} />
                <MiniMetric label="Open" value={summary.open} />
              </div>
              <Link
                href="/calendar"
                className="mt-4 flex min-h-11 items-center gap-2 rounded-lg border bg-bg-sunken px-3 py-2.5 text-sm transition-colors hover:bg-accent"
              >
                <CalendarDays className="size-4 text-primary" aria-hidden />
                <span className="min-w-0 flex-1">Open calendar schedule</span>
                <ArrowRight className="size-3.5 text-subtle-foreground" aria-hidden />
              </Link>
            </div>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.6fr)]">
          <div className="surface min-w-0 p-4 md:p-5">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold tracking-tight">Capability map</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Each card is backed by launch tasks under the LSG org lane.
                </p>
              </div>
              <Link
                href="/projects"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Open projects
                <ArrowRight className="size-3" aria-hidden />
              </Link>
            </div>
            <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {CAPABILITIES.map((capability) => {
                const Icon = capability.icon;
                const progress = capabilityProgress(data?.launchTasks ?? [], capability.terms);
                return (
                  <article
                    key={capability.title}
                    className="min-w-0 rounded-[14px] border bg-bg-sunken/60 p-3"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="flex size-9 items-center justify-center rounded-[12px] border bg-card text-primary">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="font-mono text-[11px] text-subtle-foreground">
                        {progress.matched.length} tasks
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold tracking-tight">{capability.title}</h3>
                    <p className="mt-1 min-h-12 text-xs leading-5 text-muted-foreground">
                      {capability.detail}
                    </p>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-card">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${progress.pct}%` }}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="surface min-w-0 p-4 md:p-5">
            <div className="mb-4">
              <h2 className="text-base font-semibold tracking-tight">Upcoming calendar</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Scheduled launch tasks now feed Week, Calendar, and Month.
              </p>
            </div>
            {summary.scheduled.length === 0 ? (
              <div className="rounded-[14px] border border-dashed bg-bg-sunken/60 p-6 text-center text-sm text-muted-foreground">
                No scheduled launch work yet.
              </div>
            ) : (
              <ol className="flex flex-col gap-2">
                {summary.scheduled.map(({ task }) => (
                  <li key={task.id} className="rounded-[12px] border bg-bg-sunken/60 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
                        {dateLabel(task)}
                      </span>
                      <span className={cn('ml-auto rounded-full border px-2 py-0.5 font-mono text-[10px]', STATUS_TONE[task.status])}>
                        {task.status}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm font-medium">{task.title}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-3">
          <div className="surface min-w-0 p-4 md:p-5 xl:col-span-2">
            <div className="mb-4">
              <h2 className="text-base font-semibold tracking-tight">Integration rails</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Current research path for customer phone systems, blue messaging, and CRM.
              </p>
            </div>
            <div className="grid min-w-0 gap-3 md:grid-cols-2">
              {VENDOR_RAILS.map((rail) => {
                const Icon = rail.icon;
                return (
                  <article key={rail.name} className="min-w-0 rounded-[14px] border bg-bg-sunken/60 p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-[13px] border bg-card text-primary">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold tracking-tight">{rail.name}</h3>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-subtle-foreground">
                          {rail.status}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">{rail.detail}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="surface min-w-0 p-4 md:p-5">
            <div className="mb-4">
              <h2 className="text-base font-semibold tracking-tight">Sequence</h2>
              <p className="mt-1 text-sm text-muted-foreground">The operating loop we are building.</p>
            </div>
            <ol className="flex flex-col gap-2">
              {SCRIPT_STEPS.map((step, index) => (
                <li key={step} className="flex items-center gap-3 rounded-[12px] border bg-bg-sunken/60 px-3 py-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full border bg-card font-mono text-[10px] text-primary">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="surface min-w-0 p-4 md:p-5">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" aria-hidden />
              <h2 className="text-base font-semibold tracking-tight">Guardrails</h2>
            </div>
            <div className="grid gap-2">
              {[
                'No live dialing until consent, DNC, recording, and opt-out rules are documented.',
                'Apple blue messaging uses Apple Messages for Business or an approved MSP path.',
                'Customer phone systems stay in place. We connect to RingCentral or NICE instead of forcing migration.',
                'AI handoff must preserve lead, transcript, current script, and owner.',
              ].map((item) => (
                <div key={item} className="flex gap-2 rounded-[12px] border bg-bg-sunken/60 px-3 py-2.5">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                  <p className="text-sm leading-5 text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="surface min-w-0 p-4 md:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold tracking-tight">Pilot dashboard targets</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  These are the first manager metrics to wire once a vendor connector is live.
                </p>
              </div>
              <Upload className="size-4 text-primary" aria-hidden />
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <TargetMetric label="Reach rate" value="18%" detail="answered leads" />
              <TargetMetric label="Talk time" value="2.4h" detail="per rep day" />
              <TargetMetric label="Speed" value="4x" detail="calls per rep" />
              <TargetMetric label="No-answer" value="100%" detail="follow-up queued" />
            </div>
          </div>
        </section>
      </div>
    </ViewShell>
  );
}

function HeroMetric({
  label,
  value,
  icon: Icon,
  tone = 'primary',
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone?: 'primary' | 'danger';
}) {
  return (
    <div className="min-w-0 rounded-[14px] border bg-card/75 p-3 backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <Icon
          className={cn('size-4', tone === 'danger' ? 'text-destructive' : 'text-primary')}
          aria-hidden
        />
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-subtle-foreground">
          {label}
        </span>
      </div>
      <div className="font-mono text-3xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-[12px] border bg-bg-sunken/70 p-2">
      <div className="font-mono text-xl font-semibold tabular-nums">{value}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-subtle-foreground">
        {label}
      </div>
    </div>
  );
}

function TargetMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="min-w-0 rounded-[14px] border bg-bg-sunken/60 p-4">
      <div className="font-mono text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-2 text-sm font-semibold tracking-tight">{label}</div>
      <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}
