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
        className="dot-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(closest-side,white,transparent)] opacity-40"
      />
      <div className="relative flex flex-col items-center gap-3">
        <span className="border-primary/30 bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] tracking-[0.22em] uppercase">
          <span className="bg-primary live-dot size-1.5 rounded-full" aria-hidden />
          {milestone} on deck
        </span>
        <p className="text-foreground max-w-md text-[15px]">{description}</p>
        <ul className="text-muted-foreground mt-1 grid max-w-md gap-1.5 text-left text-[13px]">
          {bullets.map((b) => (
            <li
              key={b}
              className="before:text-primary before:mr-2 before:font-mono before:content-['→']"
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
