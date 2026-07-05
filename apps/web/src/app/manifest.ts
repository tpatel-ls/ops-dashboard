import type { MetadataRoute } from 'next';
import { APP_SHORTCUTS } from '@/lib/device-setup';

type ShareTargetManifest = MetadataRoute.Manifest & {
  share_target: {
    action: string;
    method: 'GET' | 'POST';
    params: {
      title?: string;
      text?: string;
      url?: string;
    };
  };
};

export default function manifest(): ShareTargetManifest {
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
    share_target: {
      action: '/notepad',
      method: 'GET',
      params: {
        title: 'title',
        text: 'text',
        url: 'url',
      },
    },
    shortcuts: APP_SHORTCUTS.map((shortcut) => ({
      name: shortcut.name,
      short_name: shortcut.shortName,
      description: shortcut.description,
      url: shortcut.url,
      icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    })),
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
