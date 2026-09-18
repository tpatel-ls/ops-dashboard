'use client';

import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlertTriangle, ArrowRight, Inbox, Layers3, Radar } from 'lucide-react';
import { getDb } from '@ops-dashboard/core';
import { cn } from '@ops-dashboard/ui';
import { relativeTimeLabel } from '@/lib/relative-time';
import {
  findCaptureRoutingIssues,
  findStaleDomains,
  summarizeBriefing,
  type CaptureRoutingIssue,
  type StaleDomain,
} from '@/lib/briefing';

export function BriefingIntelligence() {
  const briefing = useLiveQuery(async () => {
    const db = getDb();
    const [domains, projects, tasks, captures] = await Promise.all([
      db.domains.toArray(),
      db.projects.toArray(),
      db.tasks.toArray(),
      db.captures.toArray(),
    ]);
    const staleDomains = findStaleDomains({ domains, projects, tasks }).slice(0, 4);
    const routingIssues = findCaptureRoutingIssues(captures, tasks).slice(0, 5);
    const summary = summarizeBriefing({
      tasks,
      routingIssues: routingIssues.length,
      staleDomains: staleDomains.length,
    });

    return { staleDomains, routingIssues, summary };
  });

  if (!briefing) {
    return (
      <section className="surface-flat overflow-hidden">
        <div className="bg-bg-sunken h-32 animate-pulse" />
      </section>
    );
  }

  const pressure = Math.min(
    100,
    briefing.summary.openToday * 6 +
      briefing.summary.routingIssues * 18 +
      briefing.summary.staleDomains * 16,
  );
  const readiness = Math.max(0, 100 - pressure);
  const readinessLabel =
    readiness >= 80 ? 'clear' : readiness >= 55 ? 'loaded' : readiness >= 30 ? 'hot' : 'critical';

  return (
    <section className="border-border bg-card overflow-hidden rounded-lg border shadow-sm">
      <div className="border-hairline border-b px-4 py-4 md:px-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-md">
            <Radar className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-subtle-foreground font-mono text-[10px] tracking-[0.2em] uppercase">
              Operating signal
            </div>
            <h2 className="text-lg font-semibold tracking-tight">Briefing intelligence</h2>
            <div className="mt-2 flex max-w-md items-center gap-2">
              <div className="bg-bg-sunken h-1.5 flex-1 overflow-hidden rounded-full">
                <div
                  className="bg-success h-full rounded-full transition-all"
                  style={{ width: `${readiness}%` }}
                />
              </div>
              <span className="text-muted-foreground font-mono text-[10px] tracking-[0.14em] uppercase">
                {readiness}% {readinessLabel}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <SignalPill label="Open" value={briefing.summary.openToday} tone="default" />
            <SignalPill label="Routing" value={briefing.summary.routingIssues} tone="warn" />
            <SignalPill label="Stale" value={briefing.summary.staleDomains} tone="danger" />
          </div>
        </div>
      </div>

      <div className="bg-border grid gap-px md:grid-cols-2">
        <BriefingPanel
          icon={Layers3}
          title="Domains to touch"
          description="Work areas that have gone quiet."
          href="/domains"
          empty="No stale domains. The board is warm."
        >
          {briefing.staleDomains.map((domain) => (
            <StaleDomainRow key={domain.domainId} domain={domain} />
          ))}
        </BriefingPanel>
        <BriefingPanel
          icon={Inbox}
          title="Routing queue"
          description="Captures that need a clean home."
          href="/inbox"
          empty="No capture needs routing."
        >
          {briefing.routingIssues.map((issue) => (
            <CaptureIssueRow key={issue.captureId} issue={issue} />
          ))}
        </BriefingPanel>
      </div>
    </section>
  );
}

function SignalPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'default' | 'warn' | 'danger';
}) {
  return (
    <div
      className={cn(
        'bg-bg-sunken min-w-[58px] rounded-md border px-2 py-1.5',
        tone === 'warn' && value > 0 && 'border-warning/40 bg-warning/10',
        tone === 'danger' && value > 0 && 'border-destructive/40 bg-destructive/10',
      )}
    >
      <div className="font-mono text-sm font-semibold tabular-nums">{value}</div>
      <div className="text-muted-foreground font-mono text-[9px] tracking-[0.14em] uppercase">
        {label}
      </div>
    </div>
  );
}

function BriefingPanel({
  icon: Icon,
  title,
  description,
  href,
  empty,
  children,
}: {
  icon: typeof AlertTriangle;
  title: string;
  description: string;
  href: string;
  empty: string;
  children: React.ReactNode[];
}) {
  const hasChildren = children.length > 0;
  return (
    <div className="bg-card hover:bg-bg-raised p-4 transition-colors">
      <div className="mb-3 flex items-start gap-3">
        <div className="bg-bg-sunken text-primary flex size-8 shrink-0 items-center justify-center rounded-md">
          <Icon className="size-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
        </div>
        <Link
          href={href}
          className="text-muted-foreground hover:bg-accent hover:text-foreground inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors"
          aria-label={`Open ${title}`}
        >
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
      {hasChildren ? (
        <ul className="space-y-2">{children}</ul>
      ) : (
        <div className="border-border bg-bg-sunken/60 text-muted-foreground rounded-md border border-dashed px-3 py-4 text-center text-xs">
          {empty}
        </div>
      )}
    </div>
  );
}

function StaleDomainRow({ domain }: { domain: StaleDomain }) {
  const lastTouched = relativeTimeLabel(domain.lastTouchedAt);

  return (
    <li className="bg-bg-sunken/50 flex items-center gap-3 rounded-md border px-3 py-2">
      <span
        className="size-2.5 shrink-0 rounded-[4px] ring-1 ring-black/10 ring-inset"
        style={{ background: domain.color }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm">{domain.domainName}</div>
        <div className="text-muted-foreground font-mono text-[10px]">
          {lastTouched ? `last touched ${lastTouched}` : 'never touched'}
        </div>
      </div>
      <span className="bg-warning/15 text-warning rounded px-2 py-0.5 font-mono text-[10px]">
        {domain.daysIdle}d
      </span>
    </li>
  );
}

function CaptureIssueRow({ issue }: { issue: CaptureRoutingIssue }) {
  const label =
    issue.reason === 'unprocessed'
      ? 'unprocessed'
      : issue.reason === 'missing-context'
        ? 'needs domain'
        : 'missing record';
  const created = relativeTimeLabel(issue.createdAt);

  return (
    <li className="bg-bg-sunken/50 flex items-center gap-3 rounded-md border px-3 py-2">
      <AlertTriangle className="text-warning size-3.5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm">{issue.title}</div>
        <div className="text-muted-foreground font-mono text-[10px]">
          {issue.source}
          {created ? ` · ${created}` : null}
        </div>
      </div>
      <span className="bg-primary/10 text-primary rounded px-2 py-0.5 font-mono text-[10px]">
        {label}
      </span>
    </li>
  );
}
