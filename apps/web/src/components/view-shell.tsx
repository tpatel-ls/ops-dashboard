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
  compactHeader?: boolean;
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
  compactHeader = false,
}: ViewShellProps) {
  return (
    <div
      className={cn(
        'mx-auto flex h-full w-full min-w-0 flex-col overflow-x-clip p-3 sm:p-4 md:p-6',
        compactHeader ? 'gap-3 md:gap-4' : 'gap-4 md:gap-5',
        fullWidth ? 'max-w-none' : 'max-w-[1360px]',
      )}
    >
      <header className={cn('os-panel min-w-0 rounded-xl px-4 md:px-5', compactHeader ? 'py-3 md:py-3.5' : 'py-4 md:py-5')}>
        <div className="relative flex min-w-0 flex-wrap items-start justify-between gap-3 md:gap-4">
          <div className="min-w-0 flex-1">
            <div className={cn('flex flex-wrap items-center gap-2', compactHeader ? 'mb-1 min-h-5' : 'mb-2 min-h-6')}>
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
            <h1 className={cn('font-semibold leading-[1.08] text-foreground', compactHeader ? 'text-2xl md:text-[28px]' : 'text-[26px] sm:text-[30px] md:text-[32px]')}>
              {title}
            </h1>
            {subtitle ? (
              <p className={cn('max-w-3xl text-sm text-muted-foreground', compactHeader ? 'mt-1 leading-5' : 'mt-2 leading-6')}>{subtitle}</p>
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
