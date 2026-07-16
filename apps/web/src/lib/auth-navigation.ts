export const DEFAULT_AUTH_DESTINATION = '/dashboard';

export function safeNextPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) {
    return DEFAULT_AUTH_DESTINATION;
  }
  return raw;
}
