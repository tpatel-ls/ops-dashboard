import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ops Dashboard',
    short_name: 'Ops',
    description: 'Your personal operating system — capture, tasks, routines, projects, and journal.',
    id: '/',
    start_url: '/today',
    scope: '/',
    display: 'standalone',
    // 'any' so the Tab S10 Ultra can run the landscape two-pane layout.
    orientation: 'any',
    background_color: '#15151b',
    theme_color: '#15151b',
    categories: ['productivity', 'lifestyle'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
