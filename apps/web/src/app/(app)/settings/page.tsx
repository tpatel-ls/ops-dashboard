import { ViewShell } from '@/components/view-shell';
import { SettingsForm } from '@/components/settings-form';

export default function SettingsPage() {
  return (
    <ViewShell
      eyebrow="Workspace"
      title="Settings"
      subtitle="Manage preferences, organizations, device sync, and backups."
      compactHeader
    >
      <SettingsForm />
    </ViewShell>
  );
}
