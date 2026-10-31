// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const softDeleteWhiteboard = vi.fn();
vi.mock('@/lib/whiteboards', () => ({ createWhiteboard: vi.fn(), softDeleteWhiteboard }));

const { DeleteWhiteboardButton } = await import('./whiteboard-list');

afterEach(() => {
  cleanup();
  softDeleteWhiteboard.mockReset();
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
