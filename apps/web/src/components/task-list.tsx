'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { Check, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { getDb } from '@drift/core';
import type { Task, Priority } from '@drift/core';
import { setTaskStatus } from '@/lib/tasks';
import { useAppStore } from '@/lib/app-store';
import { cn } from '@drift/ui';

interface TaskListProps {
  filter?: 'today' | 'inbox' | 'all';
}

const PRIORITY_COLOR: Record<Priority, string> = {
  0: 'transparent',
  1: 'var(--color-priority-low)',
  2: 'var(--color-priority-med)',
  3: 'var(--color-priority-urgent)',
};

const PRIORITY_GLYPH: Record<Priority, string> = {
  0: '',
  1: '!',
  2: '!!',
  3: '!!!',
};

export function TaskList({ filter = 'all' }: TaskListProps) {
  const tasks = useLiveQuery(async () => {
    const db = getDb();
    let all = await db.tasks.toArray();
    all = all.filter((t) => !t.deletedAt && t.status !== 'archived');
    if (filter === 'today') {
      const today = new Date().toISOString().slice(0, 10);
      all = all.filter(
        (t) => t.scheduledFor === today || (t.dueAt && t.dueAt.slice(0, 10) <= today),
      );
    } else if (filter === 'inbox') {
      all = all.filter((t) => !t.scheduledFor && !t.dueAt && !t.startAt);
    }
    return all.sort((a, b) => {
      if (a.status === 'done' && b.status !== 'done') return 1;
      if (b.status === 'done' && a.status !== 'done') return -1;
      return a.order - b.order;
    });
  }, [filter]);

  if (tasks === undefined) {
    return <SkeletonRows />;
  }

  if (tasks.length === 0) {
    return <EmptyState filter={filter} />;
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {tasks.map((t) => (
        <TaskRow key={t.id} task={t} />
      ))}
    </ul>
  );
}

function TaskRow({ task }: { task: Task }) {
  const done = task.status === 'done';
  const priorityColor = PRIORITY_COLOR[task.priority];
  const openEdit = useAppStore((s) => s.openEdit);
  return (
    <li
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest('button')) return;
        openEdit(task.id);
      }}
      className={cn(
        'group surface-flat relative flex cursor-pointer items-start gap-3 px-4 py-3 transition-all',
        'hover:border-border-strong hover:shadow-[0_4px_18px_-12px_rgba(0,0,0,0.45)]',
        done && 'opacity-60',
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-2 left-0 w-[3px] rounded-r-full transition-opacity"
        style={{ background: priorityColor, opacity: task.priority === 0 ? 0 : 1 }}
      />
      <button
        type="button"
        onClick={() => setTaskStatus(task.id, done ? 'todo' : 'done')}
        className={cn(
          'mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border transition-all',
          done
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border-strong text-transparent hover:border-primary hover:bg-primary/10',
        )}
        aria-label={done ? 'Mark as todo' : 'Mark as done'}
      >
        <Check className="size-3" strokeWidth={3} aria-hidden />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              'truncate text-[14px] leading-5',
              done && 'text-muted-foreground line-through decoration-muted-foreground/50',
            )}
          >
            {task.title}
          </span>
          {task.priority > 0 ? (
            <span
              className="rounded font-mono text-[10px] font-semibold leading-none"
              style={{ color: priorityColor }}
            >
              {PRIORITY_GLYPH[task.priority]}
            </span>
          ) : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-subtle-foreground">
          {task.startAt ? (
            <span className="inline-flex items-center gap-1 font-mono">
              <Clock className="size-3" aria-hidden />
              {format(parseISO(task.startAt), 'HH:mm')}
              {task.endAt ? <> to {format(parseISO(task.endAt), 'HH:mm')}</> : null}
            </span>
          ) : null}
          {task.scheduledFor && !task.startAt ? (
            <span className="font-mono">
              {format(parseISO(`${task.scheduledFor}T00:00:00`), 'EEE d MMM')}
            </span>
          ) : null}
          {task.estimateMinutes ? (
            <span className="font-mono">{task.estimateMinutes}m</span>
          ) : null}
          {task.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>
    </li>
  );
}

function SkeletonRows() {
  return (
    <ul className="flex flex-col gap-1.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <li
          key={i}
          aria-hidden
          className="surface-flat h-14 animate-pulse"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </ul>
  );
}

function EmptyState({ filter }: { filter: 'today' | 'inbox' | 'all' }) {
  const heading =
    filter === 'today'
      ? 'A clean slate.'
      : filter === 'inbox'
        ? 'Inbox is empty.'
        : 'Nothing here yet.';
  const body =
    filter === 'today'
      ? 'Capture what matters in the bar above. Try natural language: "review docs at 4pm #work !!"'
      : 'Capture an idea above. Schedule it later from any view.';
  return (
    <div className="surface flex h-full min-h-60 flex-col items-center justify-center gap-2 p-10 text-center">
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-subtle-foreground">
        {filter}
      </div>
      <h3 className="text-xl font-semibold tracking-tight">{heading}</h3>
      <p className="max-w-md text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
