import type { ReactNode } from 'react';
import { cn } from '@ops-dashboard/ui';

interface ViewShellProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  rail?: ReactNode;
  fullWidth?: boolean;
}

export function ViewShell({
  eyebrow,
  title,
  subtitle,
  meta,
  actions,
  children,
  rail,
  fullWidth = false,
}: ViewShellProps) {
  return (
    <div
      className={cn(
        'mx-auto flex h-full w-full min-w-0 flex-col gap-4 overflow-x-clip p-3 sm:p-4 md:gap-5 md:p-6',
        fullWidth ? 'max-w-none' : 'max-w-[1360px]',
      )}
    >
      <header className="os-panel min-w-0 rounded-xl px-4 py-4 md:px-5 md:py-5">
        <div className="relative flex min-w-0 flex-wrap items-start justify-between gap-3 md:gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex min-h-6 flex-wrap items-center gap-2">
              {eyebrow ? (
                <div className="inline-flex rounded-full border bg-card/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-subtle-foreground backdrop-blur">
                  {eyebrow}
                </div>
              ) : null}
              <div className="hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-subtle-foreground sm:inline-flex">
                <span className="size-1.5 rounded-full bg-success live-dot" aria-hidden />
                Live workspace
              </div>
            </div>
            <h1 className="text-[26px] font-semibold leading-[1.08] text-foreground sm:text-[30px] md:text-[32px]">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2 pt-0.5 sm:w-auto sm:justify-end">
            {meta ? <div className="min-w-0 flex-1 sm:flex-none">{meta}</div> : null}
            {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
          </div>
        </div>
      </header>
      <div
        className={cn(
          'grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-5',
          rail && 'lg:grid-cols-[minmax(0,1fr)_300px]',
        )}
      >
        <div className="min-h-0 min-w-0">{children}</div>
        {rail ? <aside className="hidden min-h-0 lg:block">{rail}</aside> : null}
      </div>
    </div>
  );
}
