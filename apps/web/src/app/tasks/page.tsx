import { ViewShell } from '@/components/view-shell';

export default function TasksPage() {
  return (
    <ViewShell eyebrow="Plan" title="Tasks" subtitle="Everything you need to do, sorted by when it's due.">
      <div className="surface flex h-64 items-center justify-center text-sm text-muted-foreground">
        Tasks view — being built.
      </div>
    </ViewShell>
  );
}
