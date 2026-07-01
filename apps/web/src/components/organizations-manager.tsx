'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Archive, Building2, Pencil, Plus } from 'lucide-react';
import { getDb } from '@ops-dashboard/core';
import type { Organization } from '@ops-dashboard/core';
import { cn } from '@ops-dashboard/ui';
import {
  archiveOrganization,
  createOrganization,
  nextOrgColor,
  updateOrganization,
} from '@/lib/organizations';

const PRESET_COLORS = [
  'oklch(0.6 0.13 265)',
  'oklch(0.7 0.16 150)',
  'oklch(0.72 0.16 60)',
  'oklch(0.65 0.18 280)',
  'oklch(0.7 0.18 30)',
  'oklch(0.68 0.18 350)',
  'oklch(0.62 0.16 200)',
];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={`Use color ${c}`}
          aria-pressed={value === c}
          className={cn(
            'size-5 rounded-full transition-transform hover:scale-110',
            value === c && 'ring-2 ring-primary ring-offset-2 ring-offset-card',
          )}
          style={{ background: c }}
        />
      ))}
    </div>
  );
}

function OrgForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Organization;
  onSave: (name: string, color: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? PRESET_COLORS[0]!);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await onSave(trimmed, color);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="surface-flat flex flex-col gap-3 p-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Organization name"
        className="input"
        autoFocus
      />
      <ColorPicker value={color} onChange={setColor} />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          {initial ? 'Save' : 'Create'}
        </button>
      </div>
    </form>
  );
}

function OrgRow({ org, projectCount }: { org: Organization; projectCount: number }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <OrgForm
        initial={org}
        onSave={async (name, color) => {
          await updateOrganization(org.id, { name, color });
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="surface-flat group flex items-center gap-2.5 px-3 py-2">
      <span
        aria-hidden
        className="size-3 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)]"
        style={{ background: org.color }}
      />
      <span className="min-w-0 flex-1 truncate text-sm">{org.name}</span>
      <span className="font-mono text-[10px] text-subtle-foreground">
        {projectCount} project{projectCount === 1 ? '' : 's'}
      </span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={`Rename ${org.name}`}
        className="rounded p-1 text-subtle-foreground opacity-0 transition-all hover:text-foreground group-hover:opacity-100"
      >
        <Pencil className="size-3.5" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => void archiveOrganization(org.id)}
        aria-label={`Archive ${org.name}`}
        className="rounded p-1 text-subtle-foreground opacity-0 transition-all hover:text-destructive group-hover:opacity-100"
      >
        <Archive className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}

/**
 * Manage org lanes from Settings: add the second org, rename, recolor,
 * archive. Projects/tasks keep their lane when an org is archived; the lane
 * just leaves the switcher.
 */
export function OrganizationsManager() {
  const [creating, setCreating] = useState(false);

  const data = useLiveQuery(async () => {
    const db = getDb();
    const [orgs, projects] = await Promise.all([
      db.organizations.toArray(),
      db.projects.toArray(),
    ]);
    const active = orgs
      .filter((o) => !o.deletedAt && !o.archivedAt)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    const counts = new Map<string, number>();
    for (const p of projects) {
      if (p.deletedAt || p.archivedAt || !p.orgId) continue;
      counts.set(p.orgId, (counts.get(p.orgId) ?? 0) + 1);
    }
    return { active, counts };
  });

  return (
    <div className="flex flex-col gap-2">
      {(data?.active ?? []).map((org) => (
        <OrgRow key={org.id} org={org} projectCount={data?.counts.get(org.id) ?? 0} />
      ))}
      {data && data.active.length === 0 && !creating ? (
        <p className="flex items-center gap-2 text-xs text-subtle-foreground">
          <Building2 className="size-3.5" aria-hidden />
          No organizations yet. Add the ones you work for; everything else stays Personal.
        </p>
      ) : null}
      {creating ? (
        <OrgForm
          onSave={async (name, color) => {
            await createOrganization({
              name,
              color: color || nextOrgColor(data?.active.length ?? 0),
            });
            setCreating(false);
          }}
          onCancel={() => setCreating(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="hairline inline-flex w-fit items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Plus className="size-3.5" aria-hidden />
          Add organization
        </button>
      )}
    </div>
  );
}
