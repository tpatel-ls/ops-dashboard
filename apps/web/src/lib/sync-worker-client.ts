'use client';

// The sync engine moved to ./sync/engine. This file is kept as a stable
// re-export so existing imports continue to resolve.
export { startSync, stopSync } from './sync/engine';
