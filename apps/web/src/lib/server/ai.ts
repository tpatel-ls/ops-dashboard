import Anthropic from '@anthropic-ai/sdk';

/**
 * Server-only Anthropic helpers. Routes that call these degrade gracefully when
 * ANTHROPIC_API_KEY is absent (getAnthropic returns null).
 */

export const MODELS = {
  // Fast classification in the capture hot path.
  triage: process.env.OPS_TRIAGE_MODEL || 'claude-haiku-4-5',
  // Vision + reasoning for journal photo extraction.
  vision: process.env.OPS_VISION_MODEL || 'claude-sonnet-4-6',
  // Chat-with-your-data (highest capability).
  chat: process.env.OPS_CHAT_MODEL || 'claude-opus-4-8',
} as const;

export const AI_REQUEST_TIMEOUT_MS = 45_000;
export const AI_MAX_RETRIES = 1;

function compatibleBaseURL(value: string | undefined): string | undefined {
  const baseURL = value?.trim();
  if (!baseURL) return undefined;
  try {
    const url = new URL(baseURL);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      return undefined;
    }
    return url.toString().replace(/\/$/, '');
  } catch {
    return undefined;
  }
}

export function anthropicClientOptions(apiKey: string, baseURL?: string) {
  const normalizedBaseURL = compatibleBaseURL(baseURL);
  return {
    apiKey: apiKey.trim(),
    timeout: AI_REQUEST_TIMEOUT_MS,
    maxRetries: AI_MAX_RETRIES,
    ...(normalizedBaseURL ? { baseURL: normalizedBaseURL } : {}),
  };
}

export function anthropicClientConfiguration(
  apiKeyValue: string | undefined,
  baseURLValue?: string,
): ReturnType<typeof anthropicClientOptions> | null {
  const apiKey = apiKeyValue?.trim();
  if (!apiKey) return null;
  const requestedBaseURL = baseURLValue?.trim();
  if (requestedBaseURL && !compatibleBaseURL(requestedBaseURL)) return null;
  return anthropicClientOptions(apiKey, requestedBaseURL);
}

let _client: Anthropic | null | undefined;

export function getAnthropic(): Anthropic | null {
  if (_client !== undefined) return _client;
  const configuration = anthropicClientConfiguration(
    process.env.ANTHROPIC_API_KEY,
    process.env.ANTHROPIC_BASE_URL,
  );
  _client = configuration ? new Anthropic(configuration) : null;
  return _client;
}
