import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@drift/core', '@drift/ui', '@drift/whiteboard'],
};

export default nextConfig;
