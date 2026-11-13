// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { useAppStore } from '@/lib/app-store';
import { HelpOverlay } from './help-overlay';

afterEach(() => {
  cleanup();
  useAppStore.setState({ helpOpen: false });
});

describe('HelpOverlay', () => {
  it('heads each shortcut group under the dialog title', () => {
    useAppStore.setState({ helpOpen: true });
    render(createElement(HelpOverlay));

    const dialog = screen.getByRole('dialog', { name: 'Keyboard shortcuts' });
    expect(screen.getByRole('heading', { level: 2, name: 'Keyboard shortcuts' })).toBeTruthy();
    expect(
      screen
        .getAllByRole('heading', { level: 3 })
        .filter((heading) => dialog.contains(heading))
        .map((heading) => heading.textContent),
    ).toEqual(['Global', 'Navigate', 'Quick add']);
  });
});
