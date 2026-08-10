export const DEFAULT_AUTH_DESTINATION = '/dashboard';

export function safeNextPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) {
    return DEFAULT_AUTH_DESTINATION;
  }
  const pathname = raw.split(/[?#]/, 1)[0]!.toLowerCase();
  if (
    pathname === '/login' ||
    pathname.startsWith('/login/') ||
    pathname === '/auth' ||
    pathname.startsWith('/auth/')
  ) {
    return DEFAULT_AUTH_DESTINATION;
  }
  return raw;
}
