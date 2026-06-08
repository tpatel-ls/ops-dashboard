'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient, isSupabaseConfigured } from '@/utils/supabase/client';

/**
 * Back-compat shim. The browser client now lives in utils/supabase/client.ts
 * (cookie-based @supabase/ssr session, shared with the server + middleware).
 */
export function getSupabase(): SupabaseClient | null {
  return createClient();
}

export { isSupabaseConfigured };
