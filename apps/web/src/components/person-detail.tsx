'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useState, useRef, useEffect } from 'react';
import { Calendar, Lightbulb, MessageSquare, Plus, Trash2, X } from 'lucide-react';
import { getDb } from '@ops-dashboard/core';
import type { Domain, Interaction, Person, PersonFact } from '@ops-dashboard/core';
import { relativeTimeLabel } from '@/lib/relative-time';
import { wrapTabFocus } from '@/lib/focus-trap';
import { useBodyScrollLock } from '@/lib/use-body-scroll-lock';
import {
  compareInteractionRecency,
  deletePerson,
  makeFact,
  makeInteraction,
  updatePerson,
} from '@/lib/people';

// ─── Facts section ────────────────────────────────────────────────────────────

function FactsSection({ person }: { person: Person }) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');

  async function addFact() {
    const l = label.trim();
    const v = value.trim();
    if (!l || !v) return;
    const fact = makeFact(l, v);
    await updatePerson(person.id, { facts: [...person.facts, fact] });
    setLabel('');
    setValue('');
    setAdding(false);
  }

  async function removeFact(id: string) {
    await updatePerson(person.id, { facts: person.facts.filter((f) => f.id !== id) });
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="text-muted-foreground size-3.5" aria-hidden />
          <span className="text-subtle-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
            Facts
          </span>
          {person.facts.length > 0 ? (
            <span className="text-subtle-foreground font-mono text-[10px]">
              ({person.facts.length})
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px]"
        >
          <Plus className="size-3" /> Add
        </button>
      </div>

      {adding ? (
        <div className="surface-flat flex flex-col gap-2 p-3">
          <input
            className="input"
            placeholder="Label (e.g. Birthday)"
            aria-label="Fact label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Escape') setAdding(false);
            }}
          />
          <input
            className="input"
            placeholder="Value (e.g. March 15)"
            aria-label="Fact value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addFact();
              if (e.key === 'Escape') setAdding(false);
            }}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="text-muted-foreground hover:text-foreground rounded-md px-3 py-1 text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={addFact}
              disabled={!label.trim() || !value.trim()}
              className="bg-primary text-primary-foreground rounded-md px-3 py-1 text-xs font-medium disabled:opacity-50"
            >
              Add fact
            </button>
          </div>
        </div>
      ) : null}

      {person.facts.length === 0 && !adding ? (
        <p className="text-subtle-foreground text-xs">No facts recorded yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {person.facts.map((fact) => (
            <FactRow key={fact.id} fact={fact} onRemove={() => removeFact(fact.id)} />
          ))}
        </ul>
      )}
    </section>
  );
}

function FactRow({ fact, onRemove }: { fact: PersonFact; onRemove: () => void }) {
  return (
    <li className="group surface-flat flex items-center gap-2 px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-subtle-foreground font-mono text-[10px] tracking-[0.14em] uppercase">
            {fact.label}
          </span>
          <span className="text-foreground text-sm">{fact.value}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive inline-flex size-6 items-center justify-center rounded opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
        aria-label="Remove fact"
      >
        <X className="size-3.5" />
      </button>
    </li>
  );
}

// ─── Interactions section ─────────────────────────────────────────────────────

function InteractionsSection({ person }: { person: Person }) {
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');

  const sorted = [...person.interactions].sort(compareInteractionRecency);

  async function addInteraction() {
    const n = note.trim();
    if (!n) return;
    const interaction = makeInteraction(n, date || undefined);
    await updatePerson(person.id, {
      interactions: [...person.interactions, interaction],
    });
    setNote('');
    setDate('');
    setAdding(false);
  }

  async function removeInteraction(id: string) {
    await updatePerson(person.id, {
      interactions: person.interactions.filter((i) => i.id !== id),
    });
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="text-muted-foreground size-3.5" aria-hidden />
          <span className="text-subtle-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
            Interactions
          </span>
          {person.interactions.length > 0 ? (
            <span className="text-subtle-foreground font-mono text-[10px]">
              ({person.interactions.length})
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px]"
        >
          <Plus className="size-3" /> Log
        </button>
      </div>

      {adding ? (
        <div className="surface-flat flex flex-col gap-2 p-3">
          <textarea
            className="input resize-none"
            placeholder="What happened or was discussed?"
            aria-label="Interaction notes"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            autoFocus
          />
          <input
            type="date"
            className="input"
            placeholder="Date (defaults to today)"
            aria-label="Interaction date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="text-muted-foreground hover:text-foreground rounded-md px-3 py-1 text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={addInteraction}
              disabled={!note.trim()}
              className="bg-primary text-primary-foreground rounded-md px-3 py-1 text-xs font-medium disabled:opacity-50"
            >
              Log interaction
            </button>
          </div>
        </div>
      ) : null}

      {sorted.length === 0 && !adding ? (
        <p className="text-subtle-foreground text-xs">No interactions logged yet.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {sorted.map((interaction) => (
            <InteractionRow
              key={interaction.id}
              interaction={interaction}
              onRemove={() => removeInteraction(interaction.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function InteractionRow({
  interaction,
  onRemove,
}: {
  interaction: Interaction;
  onRemove: () => void;
}) {
  const relative = relativeTimeLabel(interaction.date);

  return (
    <li className="group surface-flat flex gap-2.5 px-3 py-2.5">
      <div className="mt-0.5 flex-shrink-0">
        <Calendar className="text-muted-foreground size-3.5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-foreground text-sm">{interaction.note}</p>
        {relative ? (
          <span className="text-subtle-foreground font-mono text-[10px]">{relative}</span>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive inline-flex size-6 shrink-0 items-center justify-center rounded opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
        aria-label="Remove interaction"
      >
        <X className="size-3.5" />
      </button>
    </li>
  );
}

// ─── Meta / editable fields ───────────────────────────────────────────────────

function MetaSection({ person, domains }: { person: Person; domains: Domain[] }) {
  const [name, setName] = useState(person.name);
  const [relationship, setRelationship] = useState(person.relationship ?? '');

  async function saveName() {
    const n = name.trim();
    if (!n || n === person.name) return;
    await updatePerson(person.id, { name: n });
  }

  async function saveRelationship() {
    const r = relationship.trim();
    if (r === (person.relationship ?? '')) return;
    await updatePerson(person.id, { relationship: r || undefined });
  }

  async function setDomain(domainId: string) {
    await updatePerson(person.id, { domainId: domainId || undefined });
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="grid gap-2 text-sm">
        {/* Name */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground w-24 shrink-0 text-xs">Name</span>
          <input
            className="input flex-1"
            aria-label="Person name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
          />
        </div>
        {/* Relationship */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground w-24 shrink-0 text-xs">Relationship</span>
          <input
            className="input flex-1"
            aria-label="Relationship"
            placeholder="e.g. colleague, mentor, friend"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            onBlur={saveRelationship}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
          />
        </div>
        {/* Domain */}
        {domains.length > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-24 shrink-0 text-xs">Domain</span>
            <select
              aria-label="Person domain"
              value={person.domainId ?? ''}
              onChange={(e) => setDomain(e.target.value)}
              className="input flex-1"
            >
              <option value="">- none -</option>
              {domains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>
    </section>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface PersonDetailProps {
  person: Person;
  domains: Domain[];
  onClose: () => void;
  onDeleted: () => void;
}

export function PersonDetail({ person, domains, onClose, onDeleted }: PersonDetailProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useBodyScrollLock();

  // Move focus into the panel, keep Tab inside it while it is open, and hand
  // focus back to the trigger on close. Matches the project detail panel and
  // the work logger dialog.
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      wrapTabFocus(e, panelRef.current);
    }

    window.addEventListener('keydown', onKey);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener('keydown', onKey);
      previousFocusRef.current?.focus();
    };
  }, [onClose]);

  async function handleDelete() {
    await deletePerson(person.id);
    onDeleted();
  }

  // Domain chip for header
  const domain = useLiveQuery(async () => {
    if (!person.domainId) return null;
    return (await getDb().domains.get(person.domainId)) ?? null;
  }, [person.domainId]);

  const initials = person.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="person-detail-title"
        className="bg-background relative z-10 flex h-full w-full max-w-lg flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="hairline flex items-start justify-between border-b px-5 py-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="bg-primary-soft text-primary flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
              {person.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={person.avatarUrl}
                  alt={person.name}
                  referrerPolicy="no-referrer"
                  decoding="async"
                  className="size-10 rounded-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <div>
              <h2 id="person-detail-title" className="text-[15px] leading-tight font-semibold">
                {person.name}
              </h2>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                {person.relationship ? (
                  <span className="text-subtle-foreground font-mono text-[10px] tracking-[0.14em] uppercase">
                    {person.relationship}
                  </span>
                ) : null}
                {domain ? (
                  <span className="bg-bg-sunken inline-flex items-center gap-1 rounded-full px-2 py-0.5">
                    <span
                      className="size-1.5 rounded-full"
                      style={{ background: domain.color }}
                      aria-hidden
                    />
                    <span className="text-subtle-foreground font-mono text-[10px]">
                      {domain.name}
                    </span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Delete */}
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="text-muted-foreground hover:text-foreground rounded-md px-2 py-1 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground rounded-md px-2 py-1 text-xs font-medium"
                >
                  Delete
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-muted-foreground hover:text-destructive inline-flex size-7 items-center justify-center rounded-md"
                aria-label="Delete person"
              >
                <Trash2 className="size-4" />
              </button>
            )}
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground inline-flex size-7 items-center justify-center rounded-md"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 scrollbar-thin overflow-y-auto p-5">
          <div className="flex flex-col gap-6">
            <MetaSection person={person} domains={domains} />

            <div className="hairline border-t" />
            <FactsSection person={person} />

            <div className="hairline border-t" />
            <InteractionsSection person={person} />
          </div>
        </div>
      </div>
    </div>
  );
}
