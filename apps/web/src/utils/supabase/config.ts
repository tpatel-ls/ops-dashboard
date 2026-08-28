export interface SupabasePublicConfig {
  url: string;
  key: string;
}

export function supabasePublicConfig(
  urlValue: string | undefined,
  publishableKeyValue: string | undefined,
  legacyAnonKeyValue?: string,
): SupabasePublicConfig | null {
  const url = urlValue?.trim();
  const key = publishableKeyValue?.trim() || legacyAnonKeyValue?.trim();
  if (!url || !key) return null;
  try {
    const parsed = new URL(url);
    if (
      (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
      parsed.username ||
      parsed.password
    ) {
      return null;
    }
  } catch {
    return null;
  }
  return { url, key };
}
