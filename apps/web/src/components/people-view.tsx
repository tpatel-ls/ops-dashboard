'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import {
  Calendar,
  Plus,
  User,
  Users,
  X,
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { getDb } from '@ops-dashboard/core';
import type { Domain, Person } from '@ops-dashboard/core';
import { createPerson } from '@/lib/people';
import { PersonDetail } from '@/components/person-detail';
import { cn } from '@ops-dashboard/ui';

// ─── Create person form ───────────────────────────────────────────────────────

interface CreatePersonFormProps {
  onCreated: (person: Person) => void;
  onCancel: () => void;
}

function CreatePersonForm({ onCreated, onCancel }: CreatePersonFormProps) {
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const person = await createPerson({
        name: name.trim(),
        relationship: relationship.trim() || undefined,
      });
      onCreated(person);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="surface flex flex-col gap-3 p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
        New person
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Full name"
        className="input"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
        }}
      />
      <input
        value={relationship}
        onChange={(e) => setRelationship(e.target.value)}
        placeholder="Relationship (e.g. colleague, mentor, friend)"
        className="input"
      />
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
          Create
        </button>
      </div>
    </form>
  );
}

// ─── Person card ──────────────────────────────────────────────────────────────

interface PersonCardProps {
  person: Person;
  domain?: Domain;
  onClick: () => void;
}

function PersonCard({ person, domain, onClick }: PersonCardProps) {
  const factCount = person.facts.length;
  const lastInteraction =
    person.interactions.length > 0
      ? person.interactions.reduce((latest, i) =>
          new Date(i.date) > new Date(latest.date) ? i : latest,
        )
      : null;

  const initials = person.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <button
      type="button"
      onClick={onClick}
      className="surface-flat group w-full cursor-pointer px-4 py-3 text-left transition-all hover:border-border-strong hover:shadow-[0_4px_18px_-12px_rgba(0,0,0,0.45)]"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[13px] font-semibold text-primary">
          {person.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={person.avatarUrl}
              alt={person.name}
              className="size-9 rounded-full object-cover"
            />
          ) : (
            initials
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-[14px] font-medium leading-5">{person.name}</span>
            {person.relationship ? (
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-subtle-foreground">
                {person.relationship}
              </span>
            ) : null}
          </div>

          {/* Domain chip */}
          {domain ? (
            <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-bg-sunken px-2 py-0.5">
              <span
                className="size-1.5 rounded-full"
                style={{ background: domain.color }}
                aria-hidden
              />
              <span className="font-mono text-[10px] text-subtle-foreground">{domain.name}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Footer row */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-subtle-foreground">
        {factCount > 0 ? (
          <span className="inline-flex items-center gap-1">
            <User className="size-3" aria-hidden />
            {factCount} {factCount === 1 ? 'fact' : 'facts'}
          </span>
        ) : null}

        {lastInteraction ? (
          <span className="inline-flex items-center gap-1">
            <Calendar className="size-3" aria-hidden />
            {formatDistanceToNow(parseISO(lastInteraction.date), { addSuffix: true })}
          </span>
        ) : (
          <span className="text-[11px] text-subtle-foreground">No interactions yet</span>
        )}
      </div>
    </button>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function PeopleView() {
  const [creating, setCreating] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  const data = useLiveQuery(async () => {
    const db = getDb();
    const [people, domains] = await Promise.all([
      db.people.toArray().then((all) => all.filter((p) => !p.deletedAt)),
      db.domains.toArray().then((all) => all.filter((d) => !d.deletedAt)),
    ]);
    const domainMap = new Map(domains.map((d) => [d.id, d]));
    const peopleWithDomains = people.map((person) => ({
      person,
      domain: person.domainId ? domainMap.get(person.domainId) : undefined,
    }));
    // Sort alphabetically by name
    peopleWithDomains.sort((a, b) => a.person.name.localeCompare(b.person.name));
    return { peopleWithDomains, domains };
  });

  // Keep selected person live
  const liveSelectedPerson = useLiveQuery(
    async () => {
      if (!selectedPerson) return null;
      return (await getDb().people.get(selectedPerson.id)) ?? null;
    },
    [selectedPerson?.id],
  );

  const displayPerson = liveSelectedPerson !== undefined ? liveSelectedPerson : selectedPerson;

  return (
    <>
      <div className="flex flex-col gap-5">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {data ? `${data.peopleWithDomains.length} ${data.peopleWithDomains.length === 1 ? 'person' : 'people'}` : '-'}
          </span>
          <button
            type="button"
            onClick={() => setCreating((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              creating
                ? 'bg-bg-sunken text-muted-foreground'
                : 'bg-primary text-primary-foreground hover:opacity-90',
            )}
          >
            {creating ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
            {creating ? 'Cancel' : 'New'}
          </button>
        </div>

        {creating ? (
          <CreatePersonForm
            onCreated={(person) => {
              setCreating(false);
              setSelectedPerson(person);
            }}
            onCancel={() => setCreating(false)}
          />
        ) : null}

        {/* Loading skeleton */}
        {data === undefined ? (
          <div className="grid gap-1.5 lg:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                aria-hidden
                className="surface-flat h-24 animate-pulse"
                style={{ animationDelay: `${i * 70}ms` }}
              />
            ))}
          </div>
        ) : data.peopleWithDomains.length === 0 && !creating ? (
          /* Empty state */
          <div className="surface flex h-72 flex-col items-center justify-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary-soft">
              <Users className="size-5 text-primary" aria-hidden />
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-subtle-foreground">
                People
              </div>
              <h3 className="mt-1 text-xl font-semibold tracking-tight">A clean slate.</h3>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Add the people who matter - store facts and log interactions so nothing slips through the cracks.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              <Plus className="size-3.5" /> Add your first person
            </button>
          </div>
        ) : (
          <div className="grid gap-1.5 lg:grid-cols-2">
            {data.peopleWithDomains.map(({ person, domain }) => (
              <PersonCard
                key={person.id}
                person={person}
                domain={domain}
                onClick={() => setSelectedPerson(person)}
              />
            ))}
          </div>
        )}
      </div>

      {displayPerson ? (
        <PersonDetail
          person={displayPerson}
          domains={data?.domains ?? []}
          onClose={() => setSelectedPerson(null)}
          onDeleted={() => setSelectedPerson(null)}
        />
      ) : null}
    </>
  );
}
