// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const softDeleteWhiteboard = vi.fn();
vi.mock('@/lib/whiteboards', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/whiteboards')>()),
  softDeleteWhiteboard,
}));
vi.mock('dexie-react-hooks', () => ({ useLiveQuery: () => [] }));

const { DeleteWhiteboardButton, WhiteboardList } = await import('./whiteboard-list');

afterEach(() => {
  cleanup();
  softDeleteWhiteboard.mockReset();
});

describe('WhiteboardList', () => {
  it('reports a rejected name and keeps it in the field', async () => {
    render(createElement(WhiteboardList));
    // Whiteboard names are limited to 200 characters, so the real validator rejects this one.
    const name = 'x'.repeat(201);
    fireEvent.change(screen.getByLabelText('Whiteboard name'), { target: { value: name } });
    fireEvent.click(screen.getByRole('button', { name: 'Create' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Could not create this whiteboard. Your name is still here.',
    );
    expect((screen.getByLabelText('Whiteboard name') as HTMLInputElement).value).toBe(name);
  });
});

describe('DeleteWhiteboardButton', () => {
  it('deletes a board only on a second activation', () => {
    render(createElement(DeleteWhiteboardButton, { id: 'wb-1', name: 'Launch map' }));

    fireEvent.click(screen.getByRole('button', { name: 'Delete Launch map' }));
    expect(softDeleteWhiteboard).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole('button', { name: 'Delete Launch map. Activate again to confirm' }),
    );
    expect(softDeleteWhiteboard).toHaveBeenCalledWith('wb-1');
  });

  it('cancels the pending delete when focus leaves the button', () => {
    render(createElement(DeleteWhiteboardButton, { id: 'wb-1', name: 'Launch map' }));
    const button = screen.getByRole('button', { name: 'Delete Launch map' });

    fireEvent.click(button);
    fireEvent.blur(button);
    fireEvent.click(button);

    expect(softDeleteWhiteboard).not.toHaveBeenCalled();
    expect(button.getAttribute('aria-label')).toBe('Delete Launch map. Activate again to confirm');
  });
});
