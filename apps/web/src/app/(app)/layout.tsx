import { Sidebar } from '@/components/sidebar';
import { MobileNav } from '@/components/mobile-nav';
import { TopBar } from '@/components/top-bar';
import { AppShell } from '@/components/app-shell';

/**
 * The authenticated app shell. Everything under (app) gets the persistent
 * sidebar (tablet) / bottom nav (phone) + top bar. `/login` and `/auth` live
 * outside this group, so they render chrome-free.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-[100dvh] w-full overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="scrollbar-thin min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>
      </div>
      <MobileNav />
      <AppShell />
    </div>
  );
}
