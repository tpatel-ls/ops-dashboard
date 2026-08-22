export const DEFAULT_AUTH_DESTINATION = '/';

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
const MAX_NEXT_PATH_LENGTH = 2048;

function fullyDecodedPath(value: string): string | undefined {
  let decoded = value;
  for (let depth = 0; depth < 5; depth += 1) {
    let next: string;
    try {
      next = decodeURIComponent(decoded);
    } catch {
      return undefined;
    }
    if (next === decoded) return next.toLowerCase();
    decoded = next;
  }
  return undefined;
}

export function safeNextPath(raw: string | null | undefined): string {
  if (
    !raw ||
    raw.length > MAX_NEXT_PATH_LENGTH ||
    !raw.startsWith('/') ||
    raw.startsWith('//') ||
    raw.includes('\\') ||
    CONTROL_CHARACTERS.test(raw)
  ) {
    return DEFAULT_AUTH_DESTINATION;
  }
  const encodedPathname = raw.split(/[?#]/, 1)[0]!;
  const pathname = fullyDecodedPath(encodedPathname);
  if (
    !pathname ||
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
