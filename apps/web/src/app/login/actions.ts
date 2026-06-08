'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

/**
 * Single-user email/password sign-in. Public signups are disabled in the
 * Supabase dashboard; this only signs the one existing user in.
 */
export async function login(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/today') || '/today';

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
  redirect(next.startsWith('/') ? next : '/today');
}
