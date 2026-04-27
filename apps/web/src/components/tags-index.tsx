'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { getDb } from '@drift/core';
import { useAppStore } from '@/lib/app-store';

export function TagsIndex() {
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
          <span
            key={tag}
            className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs"
          >
            <span className="text-foreground">#{tag}</span>
            <span className="font-mono text-[10px] text-subtle-foreground">{count}</span>
          </span>
        ))}
      </div>
      <div className="surface scrollbar-thin max-h-[60vh] overflow-y-auto p-2">
        <ul className="flex flex-col gap-1">
          {(tasks ?? [])
            .filter((t) => t.tags.length > 0)
            .slice(0, 200)
            .map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => openEdit(t.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <span className="truncate">{t.title}</span>
                  <span className="ml-auto flex gap-1">
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
      </div>
    </div>
  );
}
