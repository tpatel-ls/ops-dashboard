import { ViewShell } from '@/components/view-shell';
import { MonthGrid } from '@/components/month-grid';

export default function MonthPage() {
  return (
    <ViewShell
      eyebrow="Plan"
      title="Month"
      subtitle="Review every scheduled task by day."
      compactHeader
      fullWidth
    >
      <MonthGrid />
    </ViewShell>
  );
}
