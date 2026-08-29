import { describe, expect, it } from 'vitest';
import {
  AI_MAX_RETRIES,
  AI_REQUEST_TIMEOUT_MS,
  anthropicClientConfiguration,
  anthropicClientOptions,
  configuredModel,
} from './ai';

describe('anthropicClientOptions', () => {
  it('normalizes model overrides and falls back for blank values', () => {
    expect(configuredModel(' custom-model ', 'default-model')).toBe('custom-model');
    expect(configuredModel('   ', 'default-model')).toBe('default-model');
    expect(configuredModel(undefined, 'default-model')).toBe('default-model');
  });

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
    expect(anthropicClientOptions('key', 'http://localhost:8787')).toMatchObject({
      baseURL: 'http://localhost:8787',
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

  it('fails closed when a configured gateway endpoint is invalid', () => {
    expect(anthropicClientConfiguration('key', 'gateway.internal')).toBeNull();
    expect(anthropicClientConfiguration('key', 'file:///tmp/gateway')).toBeNull();
    expect(anthropicClientConfiguration('key', 'https://user:secret@ai.example.test')).toBeNull();
    expect(anthropicClientConfiguration('key', 'http://ai.example.test')).toBeNull();
  });

  it('keeps direct Anthropic access when no gateway is requested', () => {
    expect(anthropicClientConfiguration(' key ', '   ')).toEqual({
      apiKey: 'key',
      timeout: AI_REQUEST_TIMEOUT_MS,
      maxRetries: AI_MAX_RETRIES,
    });
  });
});
