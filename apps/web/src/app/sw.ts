/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: '/~offline',
        matcher({ request }) {
          return request.destination === 'document';
        },
      },
    ],
  },
});

serwist.addEventListeners();

// --- Custom handlers preserved from the previous hand-rolled SW ---

// Focus/navigate the app when a notification is tapped.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = (event.notification.data as { taskId?: string } | undefined) || {};
  const url = data.taskId ? `/today?task=${data.taskId}` : '/today';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          void client.navigate(url).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow ? self.clients.openWindow(url) : null;
    }),
  );
});

// Simple PING/PONG liveness check used by the client.
self.addEventListener('message', (event) => {
  const data = event.data as { type?: string } | undefined;
  if (data?.type === 'PING') {
    event.ports[0]?.postMessage({ type: 'PONG' });
  }
});
