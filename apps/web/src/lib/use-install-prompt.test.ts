// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useInstallPrompt } from './use-install-prompt';

describe('useInstallPrompt', () => {
  it('retires a captured prompt after the user dismisses it', async () => {
    const event = new Event('beforeinstallprompt');
    Object.assign(event, {
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'dismissed', platform: 'web' }),
    });
    const { result } = renderHook(() => useInstallPrompt());

    act(() => window.dispatchEvent(event));
    await waitFor(() => expect(result.current.canPrompt).toBe(true));

    await act(async () => {
      await expect(result.current.prompt()).resolves.toBe('dismissed');
    });

    expect(result.current.canPrompt).toBe(false);
    await expect(result.current.prompt()).resolves.toBe('unavailable');
  });
});
