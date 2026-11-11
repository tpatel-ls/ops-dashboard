import { ViewShell } from '@/components/view-shell';
import { DomainsView } from '@/components/domains-view';

export const metadata = { title: 'Domains · Taskify' };

export default function DomainsPage() {
  return (
    <ViewShell
      eyebrow="More"
      title="Domains"
      subtitle="Group related projects and tasks into stable work areas."
      compactHeader
      fullWidth
    >
      <DomainsView />
    </ViewShell>
  );
}
