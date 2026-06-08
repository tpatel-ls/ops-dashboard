import type { NextConfig } from 'next';
import withSerwistInit from '@serwist/next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@drift/core', '@drift/ui', '@drift/whiteboard'],
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
