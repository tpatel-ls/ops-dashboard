import type { ReactNode } from 'react';

interface PlaceholderViewProps {
  milestone: string;
  description: string;
  bullets: string[];
  children?: ReactNode;
}

export function PlaceholderView({
  milestone,
  description,
  bullets,
  children,
}: PlaceholderViewProps) {
  return (
    <div className="surface relative flex h-full min-h-[320px] flex-col items-center justify-center gap-4 overflow-hidden p-10 text-center">
      <div
        aria-hidden
        className="dot-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(closest-side,white,transparent)]"
      />
      <div className="relative flex flex-col items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
          <span className="size-1.5 rounded-full bg-primary live-dot" aria-hidden />
          {milestone} on deck
        </span>
        <p className="max-w-md text-[15px] text-foreground">{description}</p>
        <ul className="mt-1 grid max-w-md gap-1.5 text-left text-[13px] text-muted-foreground">
          {bullets.map((b) => (
            <li
              key={b}
              className="before:mr-2 before:font-mono before:text-primary before:content-['→']"
            >
              {b}
            </li>
          ))}
        </ul>
        {children}
      </div>
    </div>
  );
}
