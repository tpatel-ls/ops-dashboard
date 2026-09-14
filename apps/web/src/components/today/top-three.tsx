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
        (t) => !t.deletedAt && t.starred === true && t.status !== 'done' && t.status !== 'archived',
      )
      .slice(0, 3);
  });

  const openEdit = useAppStore((s) => s.openEdit);

  return (
    <section>
      <div className="mb-2.5 flex items-center gap-2">
        <span className="text-subtle-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
          Daily mission
        </span>
        <Star className="text-primary size-3" fill="currentColor" aria-hidden />
        {tasks !== undefined ? (
          <span className="bg-card text-muted-foreground ml-auto rounded-full border px-2 py-0.5 font-mono text-[10px] tabular-nums">
            {tasks.length}/3 slots
          </span>
        ) : null}
      </div>

      {tasks === undefined ? (
        <div className="surface-flat h-[96px] animate-pulse" />
      ) : tasks.length === 0 ? (
        <div className="surface flex min-h-[80px] items-center justify-center gap-2 px-5 py-4 text-center">
          <Star className="text-muted-foreground size-4" aria-hidden />
          <p className="text-muted-foreground text-sm">
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

                <span className="bg-bg-sunken text-subtle-foreground hidden size-6 shrink-0 items-center justify-center rounded-full font-mono text-[10px] sm:inline-flex">
                  {index + 1}
                </span>

                {/* check-off button */}
                <button
                  type="button"
                  onClick={() => {
                    hapticSuccess();
                    void setTaskStatus(task.id, 'done');
                  }}
                  className="border-border-strong hover:border-primary hover:bg-primary/10 hover:text-primary inline-flex size-9 shrink-0 items-center justify-center rounded-full border text-transparent transition-all"
                  aria-label={`Complete ${task.title}`}
                >
                  <Check className="size-3" strokeWidth={3} aria-hidden />
                </button>

                <button
                  type="button"
                  onClick={() => openEdit(task.id)}
                  className="hover:text-primary min-w-0 flex-1 truncate py-2 text-left text-[14px] leading-5 font-medium"
                >
                  {task.title}
                </button>

                {/* unstar button */}
                <button
                  type="button"
                  onClick={() => updateTask(task.id, { starred: false })}
                  className="text-primary hover:bg-accent inline-flex size-9 shrink-0 items-center justify-center rounded-md opacity-80 transition-colors hover:opacity-100"
                  aria-label={`Remove ${task.title} from daily mission`}
                >
                  <Star className="size-4" fill="currentColor" aria-hidden />
                </button>
              </li>
            );
          })}

          {tasks.length < 3 && (
            <li className="surface-flat flex items-center gap-2 px-4 py-2.5">
              <Star className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
              <span className="text-muted-foreground text-xs">
                Star {3 - tasks.length} more task{3 - tasks.length === 1 ? '' : 's'} to fill your
                top three.
              </span>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
