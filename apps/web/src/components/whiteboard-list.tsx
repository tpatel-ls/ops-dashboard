'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import Link from 'next/link';
import { useState } from 'react';
import { format } from 'date-fns';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { getDb } from '@drift/core';
import { createWhiteboard, softDeleteWhiteboard } from '@/lib/whiteboards';

export function WhiteboardList() {
  const [name, setName] = useState('');
  const boards = useLiveQuery(async () => {
    const all = await getDb().whiteboards.toArray();
    return all.filter((w) => !w.deletedAt).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  });

  return (
    <div className="grid gap-4">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const text = name.trim();
          if (!text) return;
          await createWhiteboard(text);
          setName('');
        }}
        className="surface flex items-center gap-2 px-3 py-2"
      >
        <Plus className="size-4 text-primary" aria-hidden />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New whiteboard"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-subtle-foreground"
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
        >
          Create
        </button>
      </form>

      {boards?.length === 0 ? (
        <div className="surface flex h-40 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          <Pencil className="size-5 text-primary" aria-hidden />
          No whiteboards yet. Create one above.
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {boards?.map((b) => (
            <li key={b.id}>
              <Link
                href={`/whiteboards/${b.id}`}
                className="surface dot-grid relative flex h-40 flex-col justify-end overflow-hidden p-3 transition-colors hover:border-border-strong"
              >
                <div className="absolute inset-x-3 top-3 flex items-center gap-2 text-xs">
                  <Pencil className="size-3.5 text-primary" aria-hidden />
                  <span className="truncate font-medium text-foreground">{b.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      softDeleteWhiteboard(b.id);
                    }}
                    className="ml-auto inline-flex size-6 items-center justify-center rounded text-subtle-foreground hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
                <div className="font-mono text-[10px] text-subtle-foreground">
                  Updated {format(new Date(b.updatedAt), 'MMM d, HH:mm')}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
