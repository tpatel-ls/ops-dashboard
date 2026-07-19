import { ViewShell } from '@/components/view-shell';
import { DevicesHub } from '@/components/devices-hub';

export default function DevicesPage() {
  return (
    <ViewShell
      eyebrow="Deploy"
      title="Devices"
      subtitle="Install, verify, and troubleshoot every connected screen."
      compactHeader
      fullWidth
    >
      <DevicesHub />
    </ViewShell>
  );
}
