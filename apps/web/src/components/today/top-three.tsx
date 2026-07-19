'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { Check, Star } from 'lucide-react';
import { getDb } from '@ops-dashboard/core';
import { setTaskStatus, updateTask } from '@/lib/tasks';
import { useAppStore } from '@/lib/app-store';
import { hapticSuccess } from '@/lib/haptics';
import { cn } from '@ops-dashboard/ui';

const PRIORITY_COLOR: Record<number, string> = {
  0: 'transparent',
  1: 'var(--color-priority-low)',
  2: 'var(--color-priority-med)',
  3: 'var(--color-priority-urgent)',
};

export function TopThree() {
  const tasks = useLiveQuery(async () => {
    const all = await getDb().tasks.toArray();
    return all
      .filter(
        (t) =>
          !t.deletedAt &&
          t.starred === true &&
          t.status !== 'done' &&
          t.status !== 'archived',
      )
      .slice(0, 3);
  });

  const openEdit = useAppStore((s) => s.openEdit);

  return (
    <section>
      <div className="mb-2.5 flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
          Daily mission
        </span>
        <Star className="size-3 text-primary" fill="currentColor" aria-hidden />
        {tasks !== undefined ? (
          <span className="ml-auto rounded-full border bg-card px-2 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
            {tasks.length}/3 slots
          </span>
        ) : null}
      </div>

      {tasks === undefined ? (
        <div className="surface-flat h-[96px] animate-pulse" />
      ) : tasks.length === 0 ? (
        <div className="surface flex min-h-[80px] items-center justify-center gap-2 px-5 py-4 text-center">
          <Star className="size-4 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            Star up to three tasks to pin them here as your daily focus.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {tasks.map((task, index) => {
            const priorityColor = PRIORITY_COLOR[task.priority] ?? 'transparent';
            return (
              <li
                key={task.id}
                className={cn(
                  'surface group relative flex items-center gap-2 px-3 py-2 transition-all sm:gap-3 sm:px-4',
                  'hover:border-border-strong hover:shadow-[0_6px_24px_-14px_rgba(0,0,0,0.5)]',
                )}
              >
                {/* priority bar */}
                <span
                  aria-hidden
                  className="absolute inset-y-2 left-0 w-[3px] rounded-r-full"
                  style={{
                    background: priorityColor,
                    opacity: task.priority === 0 ? 0 : 1,
                  }}
                />

                <span className="hidden size-6 shrink-0 items-center justify-center rounded-full bg-bg-sunken font-mono text-[10px] text-subtle-foreground sm:inline-flex">
                  {index + 1}
                </span>

                {/* check-off button */}
                <button
                  type="button"
                  onClick={() => {
                    hapticSuccess();
                    void setTaskStatus(task.id, 'done');
                  }}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border-strong text-transparent transition-all hover:border-primary hover:bg-primary/10 hover:text-primary"
                  aria-label={`Complete ${task.title}`}
                >
                  <Check className="size-3" strokeWidth={3} aria-hidden />
                </button>

                <button
                  type="button"
                  onClick={() => openEdit(task.id)}
                  className="min-w-0 flex-1 truncate py-2 text-left text-[14px] font-medium leading-5 hover:text-primary"
                >
                  {task.title}
                </button>

                {/* unstar button */}
                <button
                  type="button"
                  onClick={() => updateTask(task.id, { starred: false })}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-primary opacity-80 transition-colors hover:bg-accent hover:opacity-100"
                  aria-label={`Remove ${task.title} from daily mission`}
                >
                  <Star className="size-4" fill="currentColor" aria-hidden />
                </button>
              </li>
            );
          })}

          {tasks.length < 3 && (
            <li className="surface-flat flex items-center gap-2 px-4 py-2.5">
              <Star className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="text-xs text-muted-foreground">
                Star {3 - tasks.length} more task{3 - tasks.length === 1 ? '' : 's'} to fill your top three.
              </span>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
