'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from './theme-provider';
import { DEFAULT_SETTINGS, getDb } from '@drift/core';
import type { Settings } from '@drift/core';
import { cn } from '@drift/ui';
import {
  notificationPermission,
  requestNotifications,
  type PermissionState,
} from '@/lib/notifications';
import {
  downloadJson,
  downloadText,
  exportAll,
  importAll,
  tasksToMarkdown,
  type DriftExport,
} from '@/lib/export';
import { isSupabaseConfigured, getSupabase } from '@/lib/supabase';

const VIEW_OPTIONS: Settings['defaultView'][] = [
  'today',
  'week',
  'month',
  'kanban',
  'whiteboard',
  'calendar',
  'inbox',
];

export function SettingsForm() {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [perm, setPerm] = useState<PermissionState>('default');
  const [authEmail, setAuthEmail] = useState('');
  const [authStatus, setAuthStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const db = getDb();
      const existing = await db.settings.get('singleton');
      if (cancelled) return;
      if (existing) setSettings(existing);
      else {
        const seeded: Settings = { ...DEFAULT_SETTINGS, updatedAt: new Date().toISOString() };
        await db.settings.put(seeded);
        setSettings(seeded);
      }
      setPerm(notificationPermission());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function patch(update: Partial<Settings>) {
    if (!settings) return;
    const next: Settings = { ...settings, ...update, updatedAt: new Date().toISOString() };
    setSettings(next);
    await getDb().settings.put(next);
  }

  async function sendMagicLink() {
    const supabase = getSupabase();
    if (!supabase) {
      setAuthStatus('Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and ANON_KEY.');
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({ email: authEmail });
    setAuthStatus(error ? `Error: ${error.message}` : 'Check your email for the magic link.');
  }

  if (!settings) {
    return <div className="h-40 animate-pulse rounded-xl border bg-card/40" aria-hidden />;
  }

  return (
    <div className="grid max-w-2xl gap-6">
      <Section title="Appearance" description="Light, dark, or follow the system.">
        <div className="flex gap-2">
          {(['light', 'dark', 'system'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                setTheme(opt);
                patch({ theme: opt });
              }}
              className={cn(
                'rounded-md border px-3 py-1.5 text-sm capitalize',
                theme === opt
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Workday" description="Drives the Today rail and the daily review prompt.">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Workday start">
            <input
              type="time"
              value={settings.workdayStart}
              onChange={(e) => patch({ workdayStart: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Workday end">
            <input
              type="time"
              value={settings.workdayEnd}
              onChange={(e) => patch({ workdayEnd: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Week starts on">
            <select
              value={settings.weekStartsOn}
              onChange={(e) => patch({ weekStartsOn: Number(e.target.value) as 0 | 1 })}
              className="input"
            >
              <option value={1}>Monday</option>
              <option value={0}>Sunday</option>
            </select>
          </Field>
          <Field label="Daily review at">
            <input
              type="time"
              value={settings.dailyReviewAt}
              onChange={(e) => patch({ dailyReviewAt: e.target.value })}
              className="input"
            />
          </Field>
        </div>
      </Section>

      <Section title="Default view" description="Where Drift opens.">
        <select
          value={settings.defaultView}
          onChange={(e) => patch({ defaultView: e.target.value as Settings['defaultView'] })}
          className="input max-w-xs capitalize"
        >
          {VIEW_OPTIONS.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </Section>

      <Section title="Pen and stylus" description="First class S-Pen.">
        <Toggle
          label="Lefty mode"
          description="Mirror toolbars to the right edge."
          checked={settings.leftyMode}
          onChange={(v) => patch({ leftyMode: v })}
        />
      </Section>

      <Section title="Focus mode" description="Pomodoro timer defaults.">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Focus minutes">
            <input
              type="number"
              min={5}
              max={90}
              value={settings.pomodoroFocusMinutes}
              onChange={(e) => patch({ pomodoroFocusMinutes: Number(e.target.value) })}
              className="input"
            />
          </Field>
          <Field label="Break minutes">
            <input
              type="number"
              min={1}
              max={30}
              value={settings.pomodoroBreakMinutes}
              onChange={(e) => patch({ pomodoroBreakMinutes: Number(e.target.value) })}
              className="input"
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Reminders"
        description="Web Notifications API. Service worker delivers when the tab is open."
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs',
              perm === 'granted'
                ? 'border-success/30 bg-success/10 text-success'
                : 'text-muted-foreground',
            )}
          >
            <span
              className="size-1.5 rounded-full"
              style={{
                background:
                  perm === 'granted'
                    ? 'var(--color-success)'
                    : perm === 'denied'
                      ? 'var(--color-destructive)'
                      : 'var(--color-warning)',
              }}
            />
            Permission: {perm}
          </span>
          {perm !== 'granted' && perm !== 'unsupported' ? (
            <button
              type="button"
              onClick={async () => setPerm(await requestNotifications())}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
            >
              Request permission
            </button>
          ) : null}
        </div>
      </Section>

      <Section
        title="Sync"
        description="Optional Supabase sync. Disabled by default."
      >
        <Toggle
          label="Enable sync on this device"
          description="When enabled, Drift prompts for a Supabase magic link."
          checked={settings.syncEnabled}
          onChange={(v) => patch({ syncEnabled: v })}
        />
        {settings.syncEnabled ? (
          <div className="mt-3 grid gap-2">
            {!isSupabaseConfigured() ? (
              <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                Supabase env vars are not set. Add NEXT_PUBLIC_SUPABASE_URL and
                NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="input flex-1"
                />
                <button
                  type="button"
                  onClick={sendMagicLink}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                >
                  Send magic link
                </button>
              </div>
            )}
            {authStatus ? (
              <div className="text-xs text-muted-foreground">{authStatus}</div>
            ) : null}
          </div>
        ) : null}
      </Section>

      <Section title="Data" description="Export everything, or import a backup.">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => {
              const data = await exportAll();
              downloadJson(data, `drift-${new Date().toISOString().slice(0, 10)}.json`);
            }}
            className="rounded-md border bg-card px-3 py-1.5 text-xs hover:bg-accent"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={async () => {
              const data = await exportAll();
              const md = tasksToMarkdown(data.tasks, 'Drift tasks');
              downloadText(md, `drift-${new Date().toISOString().slice(0, 10)}.md`);
            }}
            className="rounded-md border bg-card px-3 py-1.5 text-xs hover:bg-accent"
          >
            Export markdown
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="rounded-md border bg-card px-3 py-1.5 text-xs hover:bg-accent"
          >
            Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const text = await file.text();
                const parsed = JSON.parse(text) as DriftExport;
                await importAll(parsed);
                e.target.value = '';
              } catch (err) {
                alert(`Import failed: ${(err as Error).message}`);
              }
            }}
          />
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface p-4">
      <header className="mb-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </header>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-md border bg-input px-3 py-2">
      <div>
        <div className="text-sm">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <span
        className={cn(
          'relative mt-1 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-muted',
        )}
      >
        <span
          className={cn(
            'inline-block size-4 rounded-full bg-background transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0.5',
          )}
        />
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
      </span>
    </label>
  );
}
