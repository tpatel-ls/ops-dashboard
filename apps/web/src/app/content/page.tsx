import { ViewShell } from '@/components/view-shell';

export default function ContentPage() {
  return (
    <ViewShell eyebrow="Build" title="Content" subtitle="Videos, articles, and posts moving through your pipeline.">
      <div className="surface flex h-64 items-center justify-center text-sm text-muted-foreground">
        Content pipeline — being built.
      </div>
    </ViewShell>
  );
}
