// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEVICE_SETUPS } from '@/lib/device-setup';
import { DevicesHub } from './devices-hub';

// jsdom has no matchMedia; the hub reads it to detect an installed PWA.
window.matchMedia = ((query: string) => ({
  matches: false,
  media: query,
})) as typeof window.matchMedia;

afterEach(() => {
  cleanup();
});

function stubClipboard(clipboard: Partial<Clipboard> | undefined) {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clipboard });
}

describe('DevicesHub copy buttons', () => {
  it('confirms a successful copy on the button that was used', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard({ writeText });
    render(createElement(DevicesHub));

    fireEvent.click(screen.getByRole('button', { name: 'Copy Endpoint' }));

    expect(await screen.findByRole('button', { name: 'Endpoint copied' })).toBeTruthy();
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/api/capture'));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('reports a rejected clipboard write instead of failing silently', async () => {
    stubClipboard({ writeText: vi.fn().mockRejectedValue(new Error('NotAllowedError')) });
    render(createElement(DevicesHub));

    fireEvent.click(screen.getByRole('button', { name: 'Copy Tasker body' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Could not copy tasker body. Select the text below to copy it.',
    );
    expect(
      screen.getByRole('button', {
        name: 'Could not copy Tasker body. Select the text to copy it',
      }),
    ).toBeTruthy();
  });

  it('reports a missing clipboard API outside a secure context', async () => {
    stubClipboard(undefined);
    render(createElement(DevicesHub));

    fireEvent.click(screen.getByRole('button', { name: 'Copy Smoke test' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Could not copy smoke test');
  });
});

describe('DevicesHub outline', () => {
  it('heads each device card section under the device name', () => {
    render(createElement(DevicesHub));

    for (const device of DEVICE_SETUPS) {
      const name = screen.getByRole('heading', { level: 3, name: device.name });
      const card = name.closest('article')!;
      expect(
        within(card)
          .getAllByRole('heading', { level: 4 })
          .map((heading) => heading.textContent),
      ).toEqual(['Setup path', 'Best at', 'Watch for']);
    }
  });
});
