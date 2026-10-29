// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import type { Capture } from '@ops-dashboard/core';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

let captures: Capture[] = [];

vi.mock('dexie-react-hooks', () => ({ useLiveQuery: () => captures }));
vi.mock('@/components/view-shell', () => ({
  ViewShell: ({ children }: { children: React.ReactNode }) => children,
}));

const { default: InboxPage } = await import('../app/(app)/inbox/page');

function capture(patch: Partial<Capture>): Capture {
  return {
    id: 'capture-1',
    raw: 'Call the bank',
    source: 'text',
    status: 'pending',
    createdAt: '2026-10-29T09:00:00.000Z',
    updatedAt: '2026-10-29T09:00:00.000Z',
    version: 1,
    deviceId: 'device-1',
    ...patch,
  } as Capture;
}

afterEach(() => {
  cleanup();
  captures = [];
});

describe('InboxPage', () => {
  it.each(['link', 'constructor'])('still renders a synced capture whose kind is %s', (aiKind) => {
    captures = [capture({ aiKind: aiKind as Capture['aiKind'] })];

    render(createElement(InboxPage));

    expect(screen.getByText('Call the bank')).toBeTruthy();
  });
});
