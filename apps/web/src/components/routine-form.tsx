'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, X } from 'lucide-react';
import { getDb } from '@drift/core';
import type { TimeOfDay } from '@drift/core';
import { createRoutine } from '@/lib/routines';
import { cn } from '@drift/ui';

interface RoutineFormProps {
  onCreated?: () => void;
}

export function RoutineForm({ onCreated }: RoutineFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('anytime');
  const [kind, setKind] = useState<'ongoing' | 'fixed'>('ongoing');
  const [durationDays, setDurationDays] = useState<string>('30');
  const [domainId, setDomainId] = useState<string>('');
  const [notify, setNotify] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const domains = useLiveQuery(async () => {
    const all = await getDb().domains.toArray();
    return all.filter((d) => !d.deletedAt && !d.archivedAt);
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await createRoutine({
        name: trimmed,
        timeOfDay,
        kind,
        durationDays: kind === 'fixed' ? parseInt(durationDays, 10) || 30 : undefined,
        domainId: domainId || undefined,
        notify,
      });
      setName('');
      setTimeOfDay('anytime');
      setKind('ongoing');
      setDurationDays('30');
      setDomainId('');
      setNotify(false);
      setOpen(false);
      onCreated?.();
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
      >
        <Plus className="size-3.5" aria-hidden />
        New Routine
      </button>
    );
  }

  return (
    <div className="surface p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
          New Routine
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3">
        {/* Name */}
        <div>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
            Name
          </label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Meditate for 10 minutes"
            autoFocus
            required
          />
        </div>

        {/* Time of day + kind row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
              Time of Day
            </label>
            <select
              className="input"
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value as TimeOfDay)}
            >
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
              <option value="anytime">Anytime</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
              Kind
            </label>
            <select
              className="input"
              value={kind}
              onChange={(e) => setKind(e.target.value as 'ongoing' | 'fixed')}
            >
              <option value="ongoing">Ongoing</option>
              <option value="fixed">Fixed challenge</option>
            </select>
          </div>
        </div>

        {/* Duration (only for fixed) */}
        {kind === 'fixed' && (
          <div>
            <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
              Duration (days)
            </label>
            <input
              className="input"
              type="number"
              min={1}
              max={365}
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              placeholder="30"
            />
          </div>
        )}

        {/* Domain */}
        <div>
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
            Domain
          </label>
          <select
            className="input"
            value={domainId}
            onChange={(e) => setDomainId(e.target.value)}
          >
            <option value="">No domain</option>
            {domains?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.icon ? `${d.icon} ` : ''}{d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Notify toggle */}
        <label className="flex cursor-pointer items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={notify}
            onClick={() => setNotify((v) => !v)}
            className={cn(
              'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors',
              notify ? 'bg-primary' : 'bg-border-strong',
            )}
          >
            <span
              className={cn(
                'pointer-events-none inline-block size-4 translate-x-0 rounded-full bg-white shadow-sm ring-0 transition-transform',
                notify && 'translate-x-4',
              )}
            />
          </button>
          <span className="text-sm text-foreground">Enable reminders</span>
        </label>

        {/* Submit */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {submitting ? 'Creating…' : 'Create Routine'}
          </button>
        </div>
      </form>
    </div>
  );
}
