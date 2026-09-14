'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Archive, Plus } from 'lucide-react';
import { getDb } from '@ops-dashboard/core';
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
        <Plus className="text-primary size-4" aria-hidden />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New project"
          aria-label="New project name"
          className="placeholder:text-subtle-foreground flex-1 bg-transparent text-sm outline-none"
        />
        <button
          type="submit"
          className="bg-primary text-primary-foreground rounded-md px-3 py-1 text-xs font-medium"
        >
          Create
        </button>
      </form>

      {projects?.length === 0 ? (
        <div className="surface text-muted-foreground flex h-40 items-center justify-center text-sm">
          No projects yet.
        </div>
      ) : (
        <ul className="grid gap-1.5">
          {projects?.map((p) => (
            <li key={p.id} className="surface-flat flex items-center gap-3 px-3 py-2">
              <span
                aria-hidden
                className="size-3 rounded-[4px] ring-1 ring-black/5 ring-inset"
                style={{ background: p.color }}
              />
              <input
                defaultValue={p.name}
                aria-label={`Rename project ${p.name}`}
                onBlur={(e) => {
                  if (e.target.value !== p.name) renameProject(p.id, e.target.value);
                }}
                className="flex-1 bg-transparent text-sm outline-none"
              />
              {p.archivedAt ? (
                <span className="text-subtle-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
                  archived
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => archiveProject(p.id)}
                  className="text-muted-foreground hover:text-foreground inline-flex size-7 items-center justify-center rounded-md"
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
