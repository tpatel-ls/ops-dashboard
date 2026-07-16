export const metadata = { title: 'Offline · Taskify' };

export default function OfflinePage() {
  return (
    <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="dot-grid size-10 rounded-xl border" aria-hidden />
      <h1 className="text-lg font-semibold">You&rsquo;re offline</h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        Taskify works offline - your data is on this device. Reconnect to sync
        changes across your phone, tablet, and watch.
      </p>
      <a
        href="/dashboard"
        className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Back to Home
      </a>
    </div>
  );
}
