import { ViewShell } from '@/components/view-shell';

export default function HabitsPage() {
  return (
    <ViewShell eyebrow="Build" title="Habits" subtitle="Your activity across everything, GitHub-style.">
      <div className="surface flex h-64 items-center justify-center text-sm text-muted-foreground">
        Activity heatmap — being built.
      </div>
    </ViewShell>
  );
}
