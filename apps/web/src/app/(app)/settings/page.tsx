import { ViewShell } from '@/components/view-shell';
import { SettingsForm } from '@/components/settings-form';

export default function SettingsPage() {
  return (
    <ViewShell
      eyebrow="Workspace"
      title="Settings"
      subtitle="Local preferences. Sync is opt-in per device."
    >
      <SettingsForm />
    </ViewShell>
  );
}
