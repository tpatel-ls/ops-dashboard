import { timingSafeEqual } from 'node:crypto';

/**
 * Lightweight authorization for the API routes of this single-user, local-first
 * app. Layered:
 *   1. Server-to-server: a matching OPS_API_SECRET bearer (e.g. the future Wear
 *      OS capture webhook).
 *   2. Same-origin browser requests from the app's own UI — a cross-site page
 *      cannot set Sec-Fetch-Site, so this blocks third-party browser abuse while
 *      allowing the app's own fetches.
 *   3. Local dev convenience (no secret configured, not production).
 * When hosted, these routes additionally sit behind the app-wide Supabase auth
 * middleware (added at host time).
 */
export function requestAllowed(req: Request): boolean {
  const secret = process.env.OPS_API_SECRET;
  if (secret) {
    const provided = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
    const a = Buffer.from(provided);
    const b = Buffer.from(secret);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  const site = req.headers.get('sec-fetch-site');
  if (site === 'same-origin' || site === 'none') return true;
  if (!secret && process.env.NODE_ENV !== 'production') return true;
  return false;
}
