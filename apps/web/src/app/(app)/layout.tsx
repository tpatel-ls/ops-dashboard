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
    <div className="app-viewport relative flex w-full overflow-hidden">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main
          id="main-content"
          tabIndex={-1}
          className="app-scroll-region scrollbar-thin min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto pb-4 md:pb-0"
        >
          {children}
        </main>
        <MobileNav />
      </div>
      <AppShell />
    </div>
  );
}
