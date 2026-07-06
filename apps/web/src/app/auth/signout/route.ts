import { NextResponse } from 'next/server';
import { DEV_AUTH_COOKIE } from '@/lib/dev-auth';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';

/** Sign out (POST) and bounce to /login. */
export async function POST(request: Request): Promise<Response> {
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  const response = NextResponse.redirect(new URL('/login', request.url), { status: 303 });
  response.cookies.delete(DEV_AUTH_COOKIE);
  return response;
}
