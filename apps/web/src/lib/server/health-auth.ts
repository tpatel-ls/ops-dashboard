import { timingSafeEqual } from 'node:crypto';

export function healthRequestAuthorized(req: Request): boolean {
  const expectedSecrets = [process.env.CRON_SECRET, process.env.OPS_API_SECRET].filter(
    (secret): secret is string => Boolean(secret),
  );
  if (expectedSecrets.length === 0) return true;

  const provided = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const providedBytes = Buffer.from(provided);
  return expectedSecrets.some((expected) => {
    const expectedBytes = Buffer.from(expected);
    return (
      providedBytes.length === expectedBytes.length && timingSafeEqual(providedBytes, expectedBytes)
    );
  });
}
