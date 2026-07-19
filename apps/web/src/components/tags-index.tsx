'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { getDb } from '@ops-dashboard/core';
import { useAppStore } from '@/lib/app-store';
import { matchesTaskTag } from '@/lib/task-query';

export function TagsIndex() {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const tasks = useLiveQuery(async () => {
    const all = await getDb().tasks.toArray();
    return all.filter((t) => !t.deletedAt);
  });
  const openEdit = useAppStore((s) => s.openEdit);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tasks ?? []) {
      for (const tag of t.tags) map.set(tag, (map.get(tag) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [tasks]);
  const visibleTasks = (tasks ?? []).filter(
    (task) => task.tags.length > 0 && matchesTaskTag(task, selectedTag),
  );

  if (counts.length === 0) {
    return (
      <div className="surface flex h-40 items-center justify-center text-sm text-muted-foreground">
        No tags yet. Add one with #word in any task.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-1.5">
        {counts.map(([tag, count]) => (
          <button
            key={tag}
            type="button"
            onClick={() => setSelectedTag((current) => (current === tag ? null : tag))}
            aria-pressed={selectedTag === tag}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border bg-card px-3 text-xs transition-colors hover:bg-accent aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-primary"
          >
            <span className="text-foreground">#{tag}</span>
            <span className="font-mono text-[10px] text-subtle-foreground">{count}</span>
          </button>
        ))}
      </div>
      <div className="surface scrollbar-thin max-h-[60vh] overflow-y-auto p-2">
        <ul className="flex flex-col gap-1">
          {visibleTasks
            .slice(0, 200)
            .map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => openEdit(t.id)}
                  className="flex min-h-10 w-full min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <span className="truncate">{t.title}</span>
                  <span className="ml-auto flex max-w-[55%] flex-wrap justify-end gap-1">
                    {t.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-accent px-1.5 py-0.5 font-mono text-[10px] text-accent-foreground"
                      >
                        #{tag}
                      </span>
                    ))}
                  </span>
                </button>
              </li>
            ))}
        </ul>
        {visibleTasks.length === 0 ? (
          <div className="flex min-h-28 items-center justify-center px-4 text-center text-sm text-muted-foreground">
            No tasks use #{selectedTag}.
          </div>
        ) : null}
      </div>
    </div>
  );
}
