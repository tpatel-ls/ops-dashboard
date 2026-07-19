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
import { supportsAppBadge } from '@/lib/app-badge';

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
  const [capabilities, setCapabilities] = useState({
    installed: false,
    serviceWorker: false,
    appBadge: false,
    share: false,
    haptics: false,
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
      const capabilityFacts = {
        installed: standalone,
        serviceWorker,
        appBadge: supportsAppBadge(),
        share: 'share' in navigator,
        haptics: 'vibrate' in navigator,
      };

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
      setCapabilities(capabilityFacts);
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
    <div className="flex min-w-0 flex-col gap-5">
      <section className="min-w-0 overflow-hidden rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 max-w-2xl">
            <div className="mb-2 inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Radio className="size-3.5 text-primary" aria-hidden />
              Device overview
            </div>
            <h2 className="text-lg font-semibold">One workspace on every device</h2>
            <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
              Phone, tablet, Mac, and Windows run the full PWA. The watch sends voice
              captures through the paired phone into the same task inbox.
            </p>
          </div>
          <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
            <ReadinessPill label="Install" state={readiness.install} />
            <ReadinessPill label="Voice" state={readiness.voice} />
            <ReadinessPill label="Push" state={readiness.notifications} />
            <ReadinessPill label="Sync" state={readiness.sync} />
          </div>
        </div>
        <div className="mt-4 grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-5">
          {DEVICE_SETUPS.map((device) => {
            const Icon = ICONS[device.id];
            return (
              <div
                key={device.id}
                className="rounded-md border bg-bg-sunken px-2 py-2 text-center"
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
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          {DEVICE_SETUPS.map((device) => (
            <DeviceCard key={device.id} device={device} />
          ))}
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <section className="rounded-lg border bg-card p-4 shadow-sm">
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

          <section className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <MonitorSmartphone className="size-4 text-primary" aria-hidden />
              <h3 className="text-sm font-semibold tracking-tight">Browser capabilities</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <CapabilityPill label="Installed" ready={capabilities.installed} />
              <CapabilityPill label="Service worker" ready={capabilities.serviceWorker} />
              <CapabilityPill label="App badge" ready={capabilities.appBadge} />
              <CapabilityPill label="Share" ready={capabilities.share} />
              <CapabilityPill label="Haptics" ready={capabilities.haptics} />
            </div>
          </section>

          <section className="rounded-lg border bg-bg-sunken p-4">
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

function CapabilityPill({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div
      className={cn(
        'rounded-md border px-3 py-2',
        ready ? 'border-success/35 bg-success/10' : 'bg-bg-sunken',
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium">
        <span className={cn('size-1.5 rounded-full', ready ? 'bg-success' : 'bg-muted-foreground')} />
        {label}
      </div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-subtle-foreground">
        {ready ? 'ready' : 'not exposed'}
      </div>
    </div>
  );
}

function ReadinessPill({ label, state }: { label: string; state: ReadinessState }) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-md border bg-card px-3 py-2',
        (state === 'ready' || state === 'installed') && 'border-success/35 bg-success/10',
        state === 'offline' && 'border-warning/40 bg-warning/10',
        state === 'unavailable' && 'border-border',
      )}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm font-semibold">
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
    <article className="group min-w-0 overflow-hidden rounded-lg border bg-card p-4 shadow-sm transition-colors hover:border-border-strong">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-bg-sunken text-primary">
          <Icon className="size-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight">{device.name}</h3>
          <p className="text-xs text-muted-foreground">{device.role}</p>
        </div>
      </div>
      <p className="mb-4 border-l-2 border-primary pl-3 text-sm leading-5 text-foreground break-words">
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
        <div className="grid min-w-0 gap-2 sm:grid-cols-2">
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
    <div className="min-w-0">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-subtle-foreground">
        {title}
      </div>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item} className="flex min-w-0 gap-1.5 text-xs leading-5 text-muted-foreground">
            <CheckCircle2
              className={cn('mt-0.5 size-3.5 shrink-0', tone === 'success' ? 'text-success' : 'text-warning')}
              aria-hidden
            />
            <span className="min-w-0 break-words">{item}</span>
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
    <div className="mb-3 min-w-0 last:mb-0">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-subtle-foreground">
          {label}
        </span>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex h-9 items-center gap-1 rounded-md px-2 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Clipboard className="size-3" aria-hidden />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="scrollbar-thin max-h-36 max-w-full whitespace-pre-wrap break-all rounded-md border bg-bg-sunken p-3 text-[11px] leading-5 text-muted-foreground sm:overflow-auto sm:break-normal">
        <code>{value}</code>
      </pre>
    </div>
  );
}
