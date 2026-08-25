import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabasePublicConfig } from './config';

/**
 * Server Supabase client (2026 @supabase/ssr pattern, Next 16 async cookies).
 * Reads/writes the session via the request cookies using getAll/setAll. Uses the
 * publishable key so RLS still applies (this is NOT the admin/secret client).
 *
 * Returns null when Supabase isn't configured so server routes degrade gracefully.
 */
export async function createClient(): Promise<SupabaseClient | null> {
  const config = supabasePublicConfig(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  if (!config) return null;

  const cookieStore = await cookies();

  return createServerClient(config.url, config.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component - safe to ignore; middleware refreshes
          // the session cookie on the next request.
        }
      },
    },
  });
}
