// @vitest-environment jsdom

import { act, cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppNotification } from '@ops-dashboard/core';

let notifications: Partial<AppNotification>[] = [];

vi.mock('dexie-react-hooks', async () => {
  const { useEffect, useState } = await import('react');
  return {
    useLiveQuery: (query: () => Promise<unknown>) => {
      const [value, setValue] = useState<unknown>();
      useEffect(() => {
        void query().then(setValue);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return value;
    },
  };
});
vi.mock('@ops-dashboard/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@ops-dashboard/core')>()),
  getDb: () => ({ notifications: { toArray: async () => notifications } }),
}));
const markNotificationRead = vi.fn();
vi.mock('@/lib/feed', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/feed')>()),
  markNotificationRead,
}));

const { NotificationsFeed } = await import('./notifications-feed');

afterEach(() => {
  cleanup();
  notifications = [];
  markNotificationRead.mockReset();
});

describe('NotificationsFeed', () => {
  it('names the notification each mark-as-read button dismisses', async () => {
    notifications = [
      { id: 'n1', kind: 'reminder', title: 'Pay rent', createdAt: '2026-11-08T09:00:00.000Z' },
      { id: 'n2', kind: 'capture', title: 'Call Dana', createdAt: '2026-11-08T08:00:00.000Z' },
    ];
    render(createElement(NotificationsFeed));
    await act(async () => {});

    screen.getByRole('button', { name: 'Mark as read: Call Dana' }).click();
    expect(markNotificationRead).toHaveBeenCalledWith('n2');
    expect(screen.getByRole('button', { name: 'Mark as read: Pay rent' })).toBeTruthy();
  });

  it('labels the section by a level-2 heading', async () => {
    render(createElement(NotificationsFeed));
    await act(async () => {});

    const heading = screen.getByRole('heading', { level: 2, name: 'Notifications' });
    expect(screen.getByRole('region', { name: 'Notifications' }).contains(heading)).toBe(true);
  });
});
