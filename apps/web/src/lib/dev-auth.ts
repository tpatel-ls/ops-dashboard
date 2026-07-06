export const DEV_AUTH_COOKIE = 'ops-dev-auth';
export const DEV_AUTH_VALUE = 'local';

export function isLocalDevHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export function isDevAuthAvailable(hostname: string): boolean {
  return process.env.NODE_ENV !== 'production' && isLocalDevHost(hostname);
}
