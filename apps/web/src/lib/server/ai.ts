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

export function anthropicClientOptions(apiKey: string, baseURL?: string) {
  const normalizedBaseURL = baseURL?.trim();
  return {
    apiKey: apiKey.trim(),
    timeout: AI_REQUEST_TIMEOUT_MS,
    maxRetries: AI_MAX_RETRIES,
    ...(normalizedBaseURL ? { baseURL: normalizedBaseURL } : {}),
  };
}

let _client: Anthropic | null | undefined;

export function getAnthropic(): Anthropic | null {
  if (_client !== undefined) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  // Optional gateway/proxy (e.g. a self-hosted Anthropic-compatible endpoint).
  const baseURL = process.env.ANTHROPIC_BASE_URL?.trim();
  _client = apiKey ? new Anthropic(anthropicClientOptions(apiKey, baseURL)) : null;
  return _client;
}
