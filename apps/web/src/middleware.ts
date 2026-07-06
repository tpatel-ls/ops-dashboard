import type { NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on everything EXCEPT static assets and PWA files. Crucially this DOES
     * include /api so the session cookie is refreshed for server routes (the
     * in-app capture path reads it); API routes are never redirected by the
     * middleware - they self-guard.
     */
    '/((?!_next/static|_next/image|favicon.ico|sw.js|swe-worker-.*\\.js|theme-boot.js|manifest.webmanifest|icon-.*\\.png|apple-touch-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
