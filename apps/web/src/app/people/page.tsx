import { ViewShell } from '@/components/view-shell';

export default function PeoplePage() {
  return (
    <ViewShell eyebrow="Library" title="People" subtitle="A personal CRM — facts and interactions worth remembering.">
      <div className="surface flex h-64 items-center justify-center text-sm text-muted-foreground">
        People — being built.
      </div>
    </ViewShell>
  );
}
