// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const syncLsgLaunchPlan = vi.fn();
vi.mock('@/lib/lsg-work-setup', () => ({ syncLsgLaunchPlan }));
vi.mock('dexie-react-hooks', () => ({ useLiveQuery: () => undefined }));

const { PowerDialerCommandCenter } = await import('./power-dialer-command-center');

afterEach(() => {
  cleanup();
  syncLsgLaunchPlan.mockReset();
});

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('PowerDialerCommandCenter launch plan sync', () => {
  it('stays busy until the import settles and ignores a second click meanwhile', async () => {
    const pending = deferred();
    syncLsgLaunchPlan.mockReturnValue(pending.promise);
    render(createElement(PowerDialerCommandCenter));

    fireEvent.click(screen.getByRole('button', { name: 'Sync launch plan' }));
    const busy = await screen.findByRole('button', { name: 'Syncing' });
    expect((busy as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(busy);
    expect(syncLsgLaunchPlan).toHaveBeenCalledTimes(1);

    await act(async () => pending.resolve());
    expect(await screen.findByRole('button', { name: 'Sync launch plan' })).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('reports a failed import instead of leaving an unhandled rejection', async () => {
    syncLsgLaunchPlan.mockRejectedValue(new Error('Project name must be 200 characters or fewer.'));
    render(createElement(PowerDialerCommandCenter));

    fireEvent.click(screen.getByRole('button', { name: 'Sync launch plan' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Could not finish syncing the launch plan. Try again.',
    );
    expect(await screen.findByRole('button', { name: 'Sync launch plan' })).toBeTruthy();
  });
});
