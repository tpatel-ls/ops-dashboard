'use client';

import { useId, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, X } from 'lucide-react';
import { getDb } from '@ops-dashboard/core';
import type { TimeOfDay } from '@ops-dashboard/core';
import { createRoutine } from '@/lib/routines';
import { cn } from '@ops-dashboard/ui';

interface RoutineFormProps {
  onCreated?: () => void;
}

export function RoutineForm({ onCreated }: RoutineFormProps) {
  const formId = useId();
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
        className="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-90"
      >
        <Plus className="size-3.5" aria-hidden />
        New Routine
      </button>
    );
  }

  return (
    <div className="surface p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-subtle-foreground font-mono text-[10px] tracking-[0.18em] uppercase">
          New Routine
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground inline-flex size-6 items-center justify-center rounded-md transition-colors"
          aria-label="Close"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3">
        {/* Name */}
        <div>
          <label
            htmlFor={`${formId}-name`}
            className="text-subtle-foreground mb-1 block font-mono text-[10px] tracking-[0.18em] uppercase"
          >
            Name
          </label>
          <input
            id={`${formId}-name`}
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
            <label
              htmlFor={`${formId}-time-of-day`}
              className="text-subtle-foreground mb-1 block font-mono text-[10px] tracking-[0.18em] uppercase"
            >
              Time of Day
            </label>
            <select
              id={`${formId}-time-of-day`}
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
            <label
              htmlFor={`${formId}-kind`}
              className="text-subtle-foreground mb-1 block font-mono text-[10px] tracking-[0.18em] uppercase"
            >
              Kind
            </label>
            <select
              id={`${formId}-kind`}
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
            <label
              htmlFor={`${formId}-duration`}
              className="text-subtle-foreground mb-1 block font-mono text-[10px] tracking-[0.18em] uppercase"
            >
              Duration (days)
            </label>
            <input
              id={`${formId}-duration`}
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
          <label
            htmlFor={`${formId}-domain`}
            className="text-subtle-foreground mb-1 block font-mono text-[10px] tracking-[0.18em] uppercase"
          >
            Domain
          </label>
          <select
            id={`${formId}-domain`}
            className="input"
            value={domainId}
            onChange={(e) => setDomainId(e.target.value)}
          >
            <option value="">No domain</option>
            {domains?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.icon ? `${d.icon} ` : ''}
                {d.name}
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
          <span className="text-foreground text-sm">Enable reminders</span>
        </label>

        {/* Submit */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground rounded-md px-3 py-1.5 text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="bg-primary text-primary-foreground rounded-md px-4 py-1.5 text-xs font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create Routine'}
          </button>
        </div>
      </form>
    </div>
  );
}
