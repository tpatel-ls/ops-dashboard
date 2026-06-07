import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import { Sidebar } from '@/components/sidebar';
import { MobileNav } from '@/components/mobile-nav';
import { TopBar } from '@/components/top-bar';
import { ThemeProvider } from '@/components/theme-provider';
import { AppShell } from '@/components/app-shell';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Ops Dashboard',
  description: 'Your personal operating system — capture, tasks, routines, projects, and journal.',
  applicationName: 'Ops Dashboard',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Ops Dashboard', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafaf7' },
    { media: '(prefers-color-scheme: dark)', color: '#15151b' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Script src="/theme-boot.js" strategy="beforeInteractive" />
        <ThemeProvider>
          <div className="relative flex h-[100dvh] w-screen overflow-hidden">
            <Sidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <TopBar />
              <main className="scrollbar-thin min-h-0 flex-1 overflow-auto pb-20 md:pb-0">
                {children}
              </main>
            </div>
          </div>
          <MobileNav />
          <AppShell />
        </ThemeProvider>
      </body>
    </html>
  );
}
