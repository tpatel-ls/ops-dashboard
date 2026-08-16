import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Admin Supabase client - uses the SECRET key (`sb_secret_…`), which bypasses
 * RLS. Server-only; never import from a client component. Used by the Wear OS
 * capture webhook (authenticated by OPS_API_SECRET, not a user session) to write
 * rows under the single user, and by /api/health for the keep-alive ping.
 */
let _admin: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !secret) return null;
  if (_admin) return _admin;
  _admin = createSupabaseClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _admin;
}

/**
 * Resolve the single user's id for server-to-server writes (the watch webhook).
 * Prefers OPS_USER_ID; otherwise looks up the first user via the admin API and
 * caches it. Single-user app, so "the first user" is unambiguous.
 */
let _cachedUserId: string | null = null;

export async function getSingleUserId(admin: SupabaseClient): Promise<string | null> {
  const configuredUserId = process.env.OPS_USER_ID?.trim();
  if (configuredUserId) return configuredUserId;
  if (_cachedUserId) return _cachedUserId;
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 2 });
  if (error || data?.users?.length !== 1) return null;
  const first = data.users[0]!;
  _cachedUserId = first.id;
  return _cachedUserId;
}
