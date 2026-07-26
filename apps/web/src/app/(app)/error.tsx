'use client';

import Link from 'next/link';
import { AlertTriangle, CalendarCheck, RefreshCw } from 'lucide-react';

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex h-full w-full max-w-[1360px] items-center justify-center p-4 md:p-7">
      <section
        role="alert"
        aria-live="assertive"
        aria-labelledby="app-error-title"
        className="surface w-full max-w-xl px-5 py-8 text-center sm:px-8 sm:py-10"
      >
        <div className="border-warning/25 bg-warning/10 text-warning mx-auto flex size-11 items-center justify-center rounded-lg border">
          <AlertTriangle className="size-5" aria-hidden />
        </div>
        <p className="text-subtle-foreground mt-5 text-xs font-medium">Taskify</p>
        <h1 id="app-error-title" className="text-foreground mt-2 text-xl font-semibold sm:text-2xl">
          Could not load this view
        </h1>
        <p className="text-muted-foreground mx-auto mt-3 max-w-md text-sm leading-6">
          Your saved data is unchanged. Try this view again or go back to Today.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <button
            type="button"
            className="btn-primary min-h-11 w-full justify-center sm:w-auto"
            onClick={reset}
            autoFocus
          >
            <RefreshCw className="size-4" aria-hidden />
            Try again
          </button>
          <Link
            href="/dashboard"
            className="btn-secondary min-h-11 w-full justify-center sm:w-auto"
          >
            <CalendarCheck className="size-4" aria-hidden />
            Go to Today
          </Link>
        </div>
      </section>
    </div>
  );
}
