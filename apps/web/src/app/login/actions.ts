'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { safeNextPath } from '@/lib/auth-navigation';

/**
 * Single-user email/password sign-in. Public signups are disabled in the
 * Supabase dashboard; this only signs the one existing user in.
 */
export async function login(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  // Only allow same-origin absolute paths. Reject protocol-relative (`//evil`)
  // and backslash (`/\evil`) forms, which browsers resolve off-site (open redirect).
  const next = safeNextPath(String(formData.get('next') ?? ''));

  const supabase = await createClient();
  if (!supabase) {
    redirect('/login?error=not-configured');
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Never reflect raw provider errors.
    redirect('/login?error=invalid');
  }

  revalidatePath('/', 'layout');
  redirect(next);
}
