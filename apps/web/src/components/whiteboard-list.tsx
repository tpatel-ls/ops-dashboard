'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import Link from 'next/link';
import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { getDb } from '@ops-dashboard/core';
import { createWhiteboard, softDeleteWhiteboard } from '@/lib/whiteboards';
import { compareWhiteboardUpdates, whiteboardUpdatedLabel } from '@/lib/whiteboard-presentation';

export function WhiteboardList() {
  const [name, setName] = useState('');
  const boards = useLiveQuery(async () => {
    const all = await getDb().whiteboards.toArray();
    return all.filter((w) => !w.deletedAt).sort(compareWhiteboardUpdates);
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
        className="surface flex min-w-0 items-center gap-2 px-3 py-2"
      >
        <Plus className="text-primary size-4" aria-hidden />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New whiteboard"
          aria-label="Whiteboard name"
          className="placeholder:text-subtle-foreground min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="bg-primary text-primary-foreground h-10 rounded-md px-3 text-xs font-medium disabled:opacity-50"
        >
          Create
        </button>
      </form>

      {boards === undefined ? (
        <div
          className="grid gap-2 sm:grid-cols-2"
          aria-busy="true"
          aria-label="Loading whiteboards"
        >
          <div className="surface-flat h-36 animate-pulse" />
          <div className="surface-flat h-36 animate-pulse" />
        </div>
      ) : boards.length === 0 ? (
        <div className="surface text-muted-foreground flex h-40 flex-col items-center justify-center gap-2 text-sm">
          <Pencil className="text-primary size-5" aria-hidden />
          No whiteboards yet. Create one above.
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {boards?.map((b) => (
            <li key={b.id} className="surface dot-grid relative h-36 overflow-hidden">
              <Link
                href={`/whiteboards/${b.id}`}
                className="hover:bg-accent/30 flex h-full flex-col justify-between p-3 pr-12 transition-colors"
              >
                <div className="flex min-w-0 items-center gap-2 text-xs">
                  <Pencil className="text-primary size-3.5" aria-hidden />
                  <span className="text-foreground truncate font-medium">{b.name}</span>
                </div>
                <div className="text-subtle-foreground font-mono text-[10px]">
                  {whiteboardUpdatedLabel(b.updatedAt)}
                </div>
              </Link>
              <button
                type="button"
                onClick={() => void softDeleteWhiteboard(b.id)}
                className="text-subtle-foreground hover:bg-destructive/10 hover:text-destructive absolute top-2 right-2 inline-flex size-9 items-center justify-center rounded-md"
                aria-label={`Delete ${b.name}`}
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
