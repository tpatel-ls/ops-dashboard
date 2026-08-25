'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabasePublicConfig } from './config';

/**
 * Browser Supabase client (2026 @supabase/ssr pattern). Uses the publishable
 * key - safe to ship to the browser; RLS protects the data. The session lives in
 * cookies so it is shared with the server client + middleware.
 *
 * Returns null when Supabase isn't configured, so the app stays fully local-first.
 */
let _client: SupabaseClient | null = null;

function configuredPublicClient() {
  return supabasePublicConfig(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function createClient(): SupabaseClient | null {
  const config = configuredPublicClient();
  if (!config) return null;
  if (_client) return _client;
  _client = createBrowserClient(config.url, config.key);
  return _client;
}

export function isSupabaseConfigured(): boolean {
  return configuredPublicClient() !== null;
}
