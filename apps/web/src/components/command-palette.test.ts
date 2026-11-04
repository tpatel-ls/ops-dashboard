// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// cmdk measures its list and scrolls the active item into view; jsdom has neither.
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);
Element.prototype.scrollIntoView = () => {};

vi.mock('dexie-react-hooks', () => ({ useLiveQuery: () => undefined }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('./org-switcher', () => ({ useActiveOrgs: () => [] }));

const { useAppStore } = await import('@/lib/app-store');
const { CommandPalette } = await import('./command-palette');

afterEach(() => {
  cleanup();
  act(() => useAppStore.getState().closePalette());
});

describe('CommandPalette create task', () => {
  it('reports a rejected title instead of throwing to the error boundary', async () => {
    act(() => useAppStore.getState().openPalette());
    render(createElement(CommandPalette));
    // Task titles are limited to 500 characters, so the real addTask rejects this one.
    const title = 'x'.repeat(501);
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: title } });
    fireEvent.click(await screen.findByText('Create task'));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Could not add this task. Your text is still here.',
    );
    expect((input as HTMLInputElement).value).toBe(title);
    expect(useAppStore.getState().paletteOpen).toBe(true);
  });
});
