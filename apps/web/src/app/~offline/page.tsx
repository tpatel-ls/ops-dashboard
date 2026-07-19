import { CloudOff, RefreshCw } from 'lucide-react';

export const metadata = { title: 'Offline · Taskify' };

export default function OfflinePage() {
  return (
    <main className="flex min-h-[100dvh] w-full flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-lg border bg-card text-warning">
        <CloudOff className="size-5" aria-hidden />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">Connection status</p>
        <h1 className="mt-1 text-lg font-semibold">You&rsquo;re offline</h1>
      </div>
      <p className="max-w-xs text-sm text-muted-foreground">
        Cached work remains available on this device. New changes will sync after
        the connection returns.
      </p>
      <a
        href="/dashboard"
        className="mt-2 inline-flex h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
      >
        <RefreshCw className="size-4" aria-hidden />
        Try dashboard
      </a>
    </main>
  );
}
