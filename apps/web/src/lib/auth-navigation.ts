export const DEFAULT_AUTH_DESTINATION = '/';

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export function safeNextPath(raw: string | null | undefined): string {
  if (
    !raw ||
    !raw.startsWith('/') ||
    raw.startsWith('//') ||
    raw.includes('\\') ||
    CONTROL_CHARACTERS.test(raw)
  ) {
    return DEFAULT_AUTH_DESTINATION;
  }
  const encodedPathname = raw.split(/[?#]/, 1)[0]!;
  let pathname: string;
  try {
    pathname = decodeURIComponent(encodedPathname).toLowerCase();
  } catch {
    return DEFAULT_AUTH_DESTINATION;
  }
  if (
    pathname.startsWith('//') ||
    pathname.startsWith('/\\') ||
    pathname.includes('\\') ||
    CONTROL_CHARACTERS.test(pathname) ||
    pathname === '/login' ||
    pathname.startsWith('/login/') ||
    pathname === '/auth' ||
    pathname.startsWith('/auth/')
  ) {
    return DEFAULT_AUTH_DESTINATION;
  }
  return raw;
}

export function requestedAuthPath(pathname: string, search: string): string {
  const query = search.startsWith('?') ? search : '';
  return safeNextPath(`${pathname}${query}`);
}
