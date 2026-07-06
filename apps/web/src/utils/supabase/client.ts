'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser Supabase client (2026 @supabase/ssr pattern). Uses the publishable
 * key - safe to ship to the browser; RLS protects the data. The session lives in
 * cookies so it is shared with the server client + middleware.
 *
 * Returns null when Supabase isn't configured, so the app stays fully local-first.
 */
let _client: SupabaseClient | null = null;

function publishableKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    // Back-compat with the legacy anon key if a publishable key isn't set yet.
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function createClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = publishableKey();
  if (!url || !key) return null;
  if (_client) return _client;
  _client = createBrowserClient(url, key);
  return _client;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && publishableKey());
}
