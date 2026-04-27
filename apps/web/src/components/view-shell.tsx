import type { ReactNode } from 'react';

interface ViewShellProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  rail?: ReactNode;
}

export function ViewShell({
  eyebrow,
  title,
  subtitle,
  meta,
  actions,
  children,
  rail,
}: ViewShellProps) {
  return (
    <div className="mx-auto flex h-full w-full max-w-[1240px] flex-col gap-5 p-4 md:p-7">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.2em] text-subtle-foreground">
              {eyebrow}
            </div>
          ) : null}
          <h1 className="text-[28px] font-semibold leading-none tracking-tight md:text-[32px]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {meta ? <div className="flex items-center gap-3">{meta}</div> : null}
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      </header>
      <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-h-0">{children}</div>
        {rail ? <aside className="hidden min-h-0 lg:block">{rail}</aside> : null}
      </div>
    </div>
  );
}
