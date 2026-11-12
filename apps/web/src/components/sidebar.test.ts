// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const live = vi.hoisted(() => ({ inboxCount: 0, pathname: '/dashboard' }));
vi.mock('next/navigation', () => ({ usePathname: () => live.pathname }));
vi.mock('dexie-react-hooks', () => ({ useLiveQuery: () => live.inboxCount }));

const { Sidebar } = await import('./sidebar');

afterEach(() => {
  cleanup();
  live.inboxCount = 0;
  live.pathname = '/dashboard';
});

describe('Sidebar', () => {
  it('names every navigation landmark it renders', () => {
    const { container } = render(createElement(Sidebar));
    const navs = Array.from(container.querySelectorAll('nav'));

    expect(navs.length).toBeGreaterThan(0);
    expect(navs.map((nav) => nav.getAttribute('aria-label'))).toEqual(['Tasks', 'More']);
    expect(screen.getByRole('navigation', { name: 'Tasks' }).textContent).toContain('Today');
  });

  it('keeps the hover-only shortcut hint out of each link name', () => {
    render(createElement(Sidebar));

    const today = screen.getByRole('link', { name: 'Today' });
    expect(today.getAttribute('href')).toBe('/dashboard');
    expect(screen.getByRole('link', { name: 'Settings' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /g h/ })).toBeNull();
  });

  it('says what the inbox badge counts', () => {
    live.inboxCount = 3;
    // On /inbox the More section is open, so its links are exposed.
    live.pathname = '/inbox';
    render(createElement(Sidebar));

    expect(screen.getByRole('link', { name: 'Inbox, 3 pending' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Notepad' })).toBeTruthy();
  });
});
