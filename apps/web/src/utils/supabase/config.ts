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
  return url && key ? { url, key } : null;
}
