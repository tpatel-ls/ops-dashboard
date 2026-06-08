import { ViewShell } from '@/components/view-shell';
import { DomainsView } from '@/components/domains-view';

export default function DomainsPage() {
  return (
    <ViewShell
      eyebrow="More"
      title="Domains"
      subtitle="Top-level areas of your life. Everything rolls up here."
    >
      <DomainsView />
    </ViewShell>
  );
}
