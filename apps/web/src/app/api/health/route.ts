import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { createAdminClient } from '@/utils/supabase/admin';

export const runtime = 'nodejs';

/**
 * Keep-alive + health endpoint. A daily Vercel Cron hits this; the trivial
 * Supabase query keeps the free project from pausing after 7 days idle.
 *
 * Auth: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET
 * is set. We also accept OPS_API_SECRET. If neither is configured, the endpoint
 * is open (it only reads one row id and reveals nothing).
 */
function authorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET || process.env.OPS_API_SECRET;
  if (!expected) return true;
  const provided = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: Request): Promise<Response> {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    // No backend configured yet - the app is healthy in local-first mode.
    return NextResponse.json({ ok: true, db: 'unconfigured' });
  }

  const { error } = await admin.from('tasks').select('id').limit(1);
  if (error) {
    console.error('[api/health] db error:', error.message);
    return NextResponse.json({ ok: false, db: 'error' }, { status: 502 });
  }
  return NextResponse.json({ ok: true, db: 'up' });
}
