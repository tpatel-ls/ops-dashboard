// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ShareOutcome } from '@/lib/share';

const shareOrCopy = vi.fn<() => Promise<ShareOutcome>>();
vi.mock('@/lib/share', () => ({ shareOrCopy }));
vi.mock('dexie-react-hooks', () => ({ useLiveQuery: () => undefined }));
vi.mock('@/components/activity-heatmap', () => ({ ActivityHeatmap: () => null }));

const { default: HabitsPage } = await import('./page');

afterEach(() => {
  cleanup();
  shareOrCopy.mockReset();
});

describe('HabitsPage share score', () => {
  it('confirms when the score was copied instead of shared', async () => {
    shareOrCopy.mockResolvedValue('copied');
    render(createElement(HabitsPage));

    fireEvent.click(screen.getByRole('button', { name: 'Share score' }));

    expect(await screen.findByText('Score copied to the clipboard.')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('Score copied to the clipboard.');
  });

  it('reports a share that could neither share nor copy', async () => {
    shareOrCopy.mockResolvedValue('failed');
    render(createElement(HabitsPage));

    fireEvent.click(screen.getByRole('button', { name: 'Share score' }));

    expect(await screen.findByText('Could not share or copy your score.')).toBeTruthy();
  });

  it('stays quiet when the user cancels the share sheet', async () => {
    shareOrCopy.mockResolvedValue('cancelled');
    render(createElement(HabitsPage));

    fireEvent.click(screen.getByRole('button', { name: 'Share score' }));

    await vi.waitFor(() => expect(shareOrCopy).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('status').textContent).toBe('');
  });
});
