// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const board = { id: 'wb-1', name: 'Plan', document: {} };
const saveWhiteboard = vi.fn<(id: string, document: unknown) => Promise<void>>();

vi.mock('dexie-react-hooks', () => ({ useLiveQuery: () => board }));
vi.mock('@/lib/whiteboards', () => ({
  availableWhiteboard: (value: unknown) => value,
  saveWhiteboard,
}));
// Stand in for the tldraw canvas: one button emits a snapshot.
vi.mock('next/dynamic', async () => {
  const { createElement: h } = await import('react');
  return {
    default:
      () =>
      ({ onSnapshot }: { onSnapshot: (doc: unknown) => void }) =>
        h('button', { type: 'button', onClick: () => onSnapshot({ shapes: 1 }) }, 'Draw'),
  };
});

const { WhiteboardEditor } = await import('./whiteboard-editor');

afterEach(() => {
  cleanup();
  saveWhiteboard.mockReset();
});

describe('WhiteboardEditor', () => {
  it('says when a canvas change failed to save, and clears once one succeeds', async () => {
    saveWhiteboard.mockRejectedValueOnce(new DOMException('Quota', 'QuotaExceededError'));
    render(createElement(WhiteboardEditor, { id: 'wb-1' }));

    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Draw' })));
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Could not save the latest whiteboard changes.',
    );

    saveWhiteboard.mockResolvedValueOnce(undefined);
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Draw' })));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(saveWhiteboard).toHaveBeenCalledWith('wb-1', { shapes: 1 });
  });
});
