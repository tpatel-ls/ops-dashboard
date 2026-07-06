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
        'mx-auto flex h-full w-full flex-col gap-5 p-4 md:p-7',
        fullWidth ? 'max-w-none' : 'max-w-[1360px]',
      )}
    >
      <header className="os-panel rounded-[22px] px-4 py-4 md:px-5 md:py-5">
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {eyebrow ? (
                <div className="inline-flex rounded-full border bg-card/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground backdrop-blur">
                  {eyebrow}
                </div>
              ) : null}
              <div className="hidden items-center gap-1.5 rounded-full border bg-card/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-subtle-foreground backdrop-blur sm:inline-flex">
                <span className="size-1.5 rounded-full bg-success live-dot" aria-hidden />
                Daily cockpit
              </div>
            </div>
            <h1 className="bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-[28px] font-semibold leading-none tracking-tight text-transparent md:text-[34px]">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 pt-0.5">
            {meta ? <div className="flex items-center gap-2">{meta}</div> : null}
            {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
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
