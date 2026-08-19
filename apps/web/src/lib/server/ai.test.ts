import { describe, expect, it } from 'vitest';
import { AI_MAX_RETRIES, AI_REQUEST_TIMEOUT_MS, anthropicClientOptions } from './ai';

describe('anthropicClientOptions', () => {
  it('bounds AI request time and retry amplification', () => {
    expect(anthropicClientOptions('key')).toEqual({
      apiKey: 'key',
      timeout: AI_REQUEST_TIMEOUT_MS,
      maxRetries: AI_MAX_RETRIES,
    });
    expect(AI_REQUEST_TIMEOUT_MS).toBe(45_000);
    expect(AI_MAX_RETRIES).toBe(1);
  });

  it('keeps the optional compatible endpoint', () => {
    expect(anthropicClientOptions(' key ', ' https://ai.example.test ')).toMatchObject({
      apiKey: 'key',
      baseURL: 'https://ai.example.test',
    });
  });

  it('omits blank compatible endpoints', () => {
    expect(anthropicClientOptions('key', '   ')).not.toHaveProperty('baseURL');
  });

  it('omits malformed or credential-bearing compatible endpoints', () => {
    expect(anthropicClientOptions('key', 'localhost:8787')).not.toHaveProperty('baseURL');
    expect(anthropicClientOptions('key', 'file:///tmp/gateway')).not.toHaveProperty('baseURL');
    expect(anthropicClientOptions('key', 'https://user:secret@ai.example.test')).not.toHaveProperty(
      'baseURL',
    );
  });
});
