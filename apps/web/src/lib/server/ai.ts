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

let _client: Anthropic | null | undefined;

export function getAnthropic(): Anthropic | null {
  if (_client !== undefined) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  _client = apiKey ? new Anthropic({ apiKey }) : null;
  return _client;
}
