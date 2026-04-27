'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Archive, Plus } from 'lucide-react';
import { getDb } from '@drift/core';
import { archiveProject, createProject, renameProject } from '@/lib/projects';

export function ProjectsManager() {
  const projects = useLiveQuery(async () => {
    const all = await getDb().projects.toArray();
    return all.filter((p) => !p.deletedAt);
  });
  const [name, setName] = useState('');

  return (
    <div className="grid max-w-2xl gap-4">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const text = name.trim();
          if (!text) return;
          await createProject(text);
          setName('');
        }}
        className="surface flex items-center gap-2 px-3 py-2"
      >
        <Plus className="size-4 text-primary" aria-hidden />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New project"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-subtle-foreground"
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
        >
          Create
        </button>
      </form>

      {projects?.length === 0 ? (
        <div className="surface flex h-40 items-center justify-center text-sm text-muted-foreground">
          No projects yet.
        </div>
      ) : (
        <ul className="grid gap-1.5">
          {projects?.map((p) => (
            <li
              key={p.id}
              className="surface-flat flex items-center gap-3 px-3 py-2"
            >
              <span
                aria-hidden
                className="size-3 rounded-[4px] ring-1 ring-inset ring-black/5"
                style={{ background: p.color }}
              />
              <input
                defaultValue={p.name}
                onBlur={(e) => {
                  if (e.target.value !== p.name) renameProject(p.id, e.target.value);
                }}
                className="flex-1 bg-transparent text-sm outline-none"
              />
              {p.archivedAt ? (
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
                  archived
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => archiveProject(p.id)}
                  className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                  aria-label="Archive"
                >
                  <Archive className="size-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
