import { ViewShell } from '@/components/view-shell';

export default function LibraryPage() {
  return (
    <ViewShell eyebrow="Library" title="Library" subtitle="Notes, quotes, journal entries, and books in one place.">
      <div className="surface flex h-64 items-center justify-center text-sm text-muted-foreground">
        Library — being built.
      </div>
    </ViewShell>
  );
}
