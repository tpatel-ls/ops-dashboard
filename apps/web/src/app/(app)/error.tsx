'use client';

import Link from 'next/link';
import { AlertTriangle, LayoutDashboard, RefreshCw } from 'lucide-react';

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex h-full w-full max-w-[1360px] items-center justify-center p-4 md:p-7">
      <section
        role="alert"
        aria-labelledby="app-error-title"
        className="surface w-full max-w-xl px-5 py-8 text-center sm:px-8 sm:py-10"
      >
        <div className="mx-auto flex size-11 items-center justify-center rounded-lg border border-warning/25 bg-warning/10 text-warning">
          <AlertTriangle className="size-5" aria-hidden />
        </div>
        <p className="eyebrow mt-5">Recovery</p>
        <h1 id="app-error-title" className="mt-2 text-xl font-semibold text-text-primary sm:text-2xl">
          Could not load this view
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-text-secondary">
          Your saved data is unchanged. Retry the view or return to Life Command to keep working.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
          <button type="button" className="btn-primary justify-center" onClick={reset}>
            <RefreshCw className="size-4" aria-hidden />
            Try again
          </button>
          <Link href="/dashboard" className="btn-secondary justify-center">
            <LayoutDashboard className="size-4" aria-hidden />
            Life Command
          </Link>
        </div>
      </section>
    </div>
  );
}
