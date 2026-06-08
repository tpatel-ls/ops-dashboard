import { ViewShell } from '@/components/view-shell';
import { MonthGrid } from '@/components/month-grid';

export default function MonthPage() {
  return (
    <ViewShell eyebrow="Plan" title="Month" subtitle="Pick a day to triage in the side panel.">
      <MonthGrid />
    </ViewShell>
  );
}
