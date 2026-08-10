import { NextResponse, type NextRequest } from 'next/server';
import { safeNextPath } from '@/lib/auth-navigation';
import { DEV_AUTH_COOKIE, DEV_AUTH_VALUE, isDevAuthAvailable } from '@/lib/dev-auth';

export function GET(request: NextRequest) {
  if (!isDevAuthAvailable(request.nextUrl.hostname)) {
    return NextResponse.json({ ok: false, reason: 'not-found' }, { status: 404 });
  }

  const redirectUrl = new URL(safeNextPath(request.nextUrl.searchParams.get('next')), request.url);

  const response = NextResponse.redirect(redirectUrl, { status: 303 });
  response.cookies.set(DEV_AUTH_COOKIE, DEV_AUTH_VALUE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
