import { CloudOff, RefreshCw } from 'lucide-react';

export const metadata = { title: 'Offline · Taskify' };

export default function OfflinePage() {
  return (
    <main className="flex min-h-[100dvh] w-full flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="bg-card text-warning flex size-12 items-center justify-center rounded-lg border">
        <CloudOff className="size-5" aria-hidden />
      </div>
      <div>
        <p className="text-muted-foreground text-xs font-medium">Connection status</p>
        <h1 className="mt-1 text-lg font-semibold">You&rsquo;re offline</h1>
      </div>
      <p className="text-muted-foreground max-w-xs text-sm">
        Cached work remains available on this device. New changes will sync after the connection
        returns.
      </p>
      <a
        href="/dashboard"
        className="bg-primary text-primary-foreground mt-2 inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm font-medium"
      >
        <RefreshCw className="size-4" aria-hidden />
        Try dashboard
      </a>
    </main>
  );
}
