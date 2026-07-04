'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clipboard,
  Laptop,
  MonitorSmartphone,
  Radio,
  Smartphone,
  Tablet,
  Watch,
  WifiOff,
} from 'lucide-react';
import { cn } from '@ops-dashboard/ui';
import {
  DEVICE_SETUPS,
  getInstallReadiness,
  type DeviceSetup,
  type InstallReadiness,
  type ReadinessState,
} from '@/lib/device-setup';

const ICONS: Record<DeviceSetup['id'], typeof Smartphone> = {
  's24-ultra': Smartphone,
  'tab-s10-ultra': Tablet,
  'galaxy-watch': Watch,
  mac: Laptop,
  windows: MonitorSmartphone,
};

const READINESS_LABEL: Record<ReadinessState, string> = {
  ready: 'Ready',
  installed: 'Installed',
  offline: 'Offline',
  unavailable: 'Unavailable',
};

export function DevicesHub() {
  const [readiness, setReadiness] = useState<InstallReadiness>({
    install: 'unavailable',
    voice: 'unavailable',
    notifications: 'unavailable',
    sync: 'offline',
  });
  const [endpoint, setEndpoint] = useState('https://APP.vercel.app/api/capture');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    function updateBrowserFacts() {
      if (cancelled) return;
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      const speech = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
      const notification = 'Notification' in window;
      const serviceWorker = 'serviceWorker' in navigator;
      const mediaRecorder = 'MediaRecorder' in window && Boolean(navigator.mediaDevices);

      setReadiness(
        getInstallReadiness({
          standalone,
          serviceWorker,
          mediaRecorder,
          speechRecognition: speech,
          notification,
          online: navigator.onLine,
        }),
      );
      setEndpoint(`${window.location.origin}/api/capture`);
    }

    const frame = window.requestAnimationFrame(updateBrowserFacts);
    window.addEventListener('online', updateBrowserFacts);
    window.addEventListener('offline', updateBrowserFacts);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      window.removeEventListener('online', updateBrowserFacts);
      window.removeEventListener('offline', updateBrowserFacts);
    };
  }, []);

  const watchBody = useMemo(() => {
    const offset = new Date().getTimezoneOffset();
    return JSON.stringify({ raw: '%VOICE', tzOffsetMinutes: offset }, null, 2);
  }, []);
  const watchCurl = useMemo(
    () =>
      [
        `curl -sS -X POST "${endpoint}" \\`,
        '  -H "Authorization: Bearer OPS_API_SECRET" \\',
        '  -H "Content-Type: application/json" \\',
        `  -d '${watchBody.replaceAll("'", "'\\''")}'`,
      ].join('\n'),
    [endpoint, watchBody],
  );

  async function copy(id: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    window.setTimeout(() => setCopied((current) => (current === id ? null : current)), 1400);
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="relative overflow-hidden rounded-[22px] border border-border bg-card p-5 shadow-sm md:p-6">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,color-mix(in_oklch,var(--primary)_28%,transparent),transparent_34%),radial-gradient(circle_at_88%_10%,color-mix(in_oklch,var(--success)_18%,transparent),transparent_36%)]"
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border bg-card/70 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <Radio className="size-3.5 text-primary" aria-hidden />
              One system, every device
            </div>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Capture anywhere. Review everywhere.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              The full app runs as a PWA on phone, tablet, Mac, and Windows. The watch
              stays lean: it sends spoken captures through the paired S24 Ultra into the
              same triage pipeline.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <ReadinessPill label="Install" state={readiness.install} />
            <ReadinessPill label="Voice" state={readiness.voice} />
            <ReadinessPill label="Push" state={readiness.notifications} />
            <ReadinessPill label="Sync" state={readiness.sync} />
          </div>
        </div>
        <div className="relative mt-5 grid grid-cols-5 gap-2">
          {DEVICE_SETUPS.map((device, index) => {
            const Icon = ICONS[device.id];
            return (
              <div
                key={device.id}
                className="rounded-[14px] border bg-card/62 px-2 py-2 text-center backdrop-blur"
                style={{ transform: `translateY(${index % 2 === 0 ? 0 : 6}px)` }}
              >
                <Icon className="mx-auto size-4 text-primary" aria-hidden />
                <div className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                  {device.id === 'galaxy-watch' ? 'Watch' : device.id === 'tab-s10-ultra' ? 'Tablet' : device.id === 's24-ultra' ? 'Phone' : device.name}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-4 lg:grid-cols-2">
          {DEVICE_SETUPS.map((device) => (
            <DeviceCard key={device.id} device={device} />
          ))}
        </div>

        <aside className="flex flex-col gap-4">
          <section className="rounded-[18px] border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Watch className="size-4 text-primary" aria-hidden />
              <h3 className="text-sm font-semibold tracking-tight">Watch webhook</h3>
            </div>
            <CopyBlock
              id="endpoint"
              label="Endpoint"
              value={endpoint}
              copied={copied === 'endpoint'}
              onCopy={() => copy('endpoint', endpoint)}
            />
            <CopyBlock
              id="body"
              label="Tasker body"
              value={watchBody}
              copied={copied === 'body'}
              onCopy={() => copy('body', watchBody)}
            />
            <CopyBlock
              id="curl"
              label="Smoke test"
              value={watchCurl}
              copied={copied === 'curl'}
              onCopy={() => copy('curl', watchCurl)}
            />
          </section>

          <section className="rounded-[18px] border bg-bg-sunken p-4">
            <div className="mb-2 flex items-center gap-2">
              <WifiOff className="size-4 text-warning" aria-hidden />
              <h3 className="text-sm font-semibold tracking-tight">Honest limits</h3>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Wear OS is a trigger, not the full dashboard. For reliability, the phone
              records or receives the voice text, posts to the server, and Supabase sync
              distributes the result to every signed-in screen.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function ReadinessPill({ label, state }: { label: string; state: ReadinessState }) {
  return (
    <div
      className={cn(
        'rounded-[14px] border bg-card/75 px-3 py-2 backdrop-blur',
        (state === 'ready' || state === 'installed') && 'border-success/35 bg-success/10',
        state === 'offline' && 'border-warning/40 bg-warning/10',
        state === 'unavailable' && 'border-border',
      )}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold">
        <span
          className={cn(
            'size-1.5 rounded-full bg-muted-foreground',
            (state === 'ready' || state === 'installed') && 'bg-success',
            state === 'offline' && 'bg-warning',
          )}
          aria-hidden
        />
        {READINESS_LABEL[state]}
      </div>
    </div>
  );
}

function DeviceCard({ device }: { device: DeviceSetup }) {
  const Icon = ICONS[device.id];
  return (
    <article className="group relative overflow-hidden rounded-[18px] border bg-card p-4 shadow-sm transition-colors hover:border-border-strong">
      <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-warning to-success opacity-70" aria-hidden />
      <div className="mb-4 flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-[15px] bg-bg-sunken text-primary transition-transform group-hover:-translate-y-0.5">
          <Icon className="size-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight">{device.name}</h3>
          <p className="text-xs text-muted-foreground">{device.role}</p>
        </div>
      </div>
      <p className="mb-4 rounded-[14px] border bg-bg-sunken/60 px-3 py-2 text-sm leading-5 text-foreground">
        {device.primaryAction}
      </p>
      <div className="space-y-4">
        <div>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground">
            Setup path
          </div>
          <ol className="space-y-1.5">
            {device.installSteps.map((step, index) => (
              <li key={step} className="flex gap-2 text-sm leading-5 text-muted-foreground">
                <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border bg-card font-mono text-[10px] text-foreground">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <TagList title="Best at" items={device.strengths} tone="success" />
          <TagList title="Watch for" items={device.limitations} tone="warning" />
        </div>
      </div>
    </article>
  );
}

function TagList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: 'success' | 'warning';
}) {
  return (
    <div>
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-subtle-foreground">
        {title}
      </div>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item} className="flex gap-1.5 text-xs leading-5 text-muted-foreground">
            <CheckCircle2
              className={cn('mt-0.5 size-3.5 shrink-0', tone === 'success' ? 'text-success' : 'text-warning')}
              aria-hidden
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CopyBlock({
  label,
  value,
  copied,
  onCopy,
}: {
  id: string;
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-subtle-foreground">
          {label}
        </span>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Clipboard className="size-3" aria-hidden />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="scrollbar-thin max-h-36 overflow-auto rounded-[12px] border bg-bg-sunken p-3 text-[11px] leading-5 text-muted-foreground">
        <code>{value}</code>
      </pre>
    </div>
  );
}
