import type { NextConfig } from 'next';
import withSerwistInit from '@serwist/next';
import { SECURITY_HEADERS } from './src/lib/security-headers';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ops-dashboard/core', '@ops-dashboard/ui', '@ops-dashboard/whiteboard'],
  async headers() {
    return [{ source: '/(.*)', headers: [...SECURITY_HEADERS] }];
  },
};

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  cacheOnNavigation: true,
  reloadOnOnline: true,
  additionalPrecacheEntries: [{ url: '/~offline', revision: 'v1' }],
  // The SW never runs in `next dev`; disabling there avoids stale-cache confusion.
  disable: process.env.NODE_ENV === 'development',
});

export default withSerwist(nextConfig);
