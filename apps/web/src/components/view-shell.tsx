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
    <div className="mx-auto flex h-full w-full max-w-[1280px] flex-col gap-5 p-4 md:p-7">
      <header className="os-panel rounded-[22px] px-4 py-4 md:px-5">
        <div className="relative flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            {eyebrow ? (
              <div className="mb-1 inline-flex rounded-full border bg-card/60 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-subtle-foreground backdrop-blur">
                {eyebrow}
              </div>
            ) : null}
            <h1 className="text-[28px] font-semibold leading-none tracking-tight md:text-[34px]">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {meta ? <div className="flex items-center gap-2">{meta}</div> : null}
            {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
          </div>
        </div>
      </header>
      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-h-0 min-w-0">{children}</div>
        {rail ? <aside className="hidden min-h-0 lg:block">{rail}</aside> : null}
      </div>
    </div>
  );
}
