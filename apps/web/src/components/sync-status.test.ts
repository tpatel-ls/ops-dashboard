// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { setSyncStatus } from '@/lib/sync/status';
import { SyncStatus } from './sync-status';

afterEach(() => {
  cleanup();
  act(() => setSyncStatus({ state: 'off', pending: 0 }));
});

describe('SyncStatus', () => {
  it('does not claim queued changes while offline with nothing pending', () => {
    act(() => setSyncStatus({ state: 'offline', pending: 0 }));
    render(createElement(SyncStatus));

    expect(screen.getByRole('status').textContent).toBe('Offline');
  });

  it('says how many changes are queued once', () => {
    act(() => setSyncStatus({ state: 'offline', pending: 3 }));
    render(createElement(SyncStatus));

    const text = screen.getByRole('status').textContent ?? '';
    expect(text).toBe('Offline3 queued');
    expect(text.match(/queued/g)).toHaveLength(1);
  });

  it('hides the pending count when asked', () => {
    act(() => setSyncStatus({ state: 'live', pending: 2 }));
    render(createElement(SyncStatus, { showPending: false }));

    expect(screen.getByRole('status').textContent).toBe('Synced');
  });
});
