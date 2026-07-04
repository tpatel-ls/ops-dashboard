import { ViewShell } from '@/components/view-shell';
import { DevicesHub } from '@/components/devices-hub';

export default function DevicesPage() {
  return (
    <ViewShell
      eyebrow="Deploy"
      title="Devices"
      subtitle="Galaxy phone, tablet, watch, Mac, and Windows running one owned dashboard."
    >
      <DevicesHub />
    </ViewShell>
  );
}
