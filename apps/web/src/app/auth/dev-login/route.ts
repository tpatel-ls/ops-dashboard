import { NextResponse, type NextRequest } from 'next/server';
import { DEV_AUTH_COOKIE, DEV_AUTH_VALUE, isDevAuthAvailable } from '@/lib/dev-auth';

function safeNext(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\')
    ? value
    : '/dashboard';
}

export function GET(request: NextRequest) {
  if (!isDevAuthAvailable(request.nextUrl.hostname)) {
    return NextResponse.json({ ok: false, reason: 'not-found' }, { status: 404 });
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = safeNext(request.nextUrl.searchParams.get('next'));
  redirectUrl.search = '';

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
